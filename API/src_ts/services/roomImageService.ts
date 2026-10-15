/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements room image service domain operations and their persistence or integrations.
 */

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import type { Room } from '@prisma/client';
import config from '../config';
import { MAX_ROOM_IMAGE_BYTES, RoomImageContentType } from '../constants/roomImages';
import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';
import logger from '../utils/logger';

const PENDING_UPLOAD_KEY_PATTERN = /^pending-room-images\/(\d+)\/([0-9a-f-]{36})\.(jpg|png|webp)$/i;
const CONTENT_TYPE_EXTENSION: Record<RoomImageContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

let s3Client: S3Client | null = null;

/**
 * Reads the required bucket and region settings for room-image storage.

 * @returns The configured image bucket and region.
 */
function storageConfig() {
  if (!config.ROOM_IMAGE_S3_BUCKET) {
    throw createHttpError('Room image storage is not configured', 503);
  }
  if (!config.AWS_REGION) {
    throw createHttpError('AWS_REGION is required for room image storage', 503);
  }
  if (config.ROOM_IMAGE_UPLOAD_TTL_SECONDS < 60 || config.ROOM_IMAGE_UPLOAD_TTL_SECONDS > 3600) {
    throw createHttpError('ROOM_IMAGE_UPLOAD_TTL_SECONDS must be between 60 and 3600', 500);
  }
  return { bucket: config.ROOM_IMAGE_S3_BUCKET, region: config.AWS_REGION };
}

/**
 * Returns the configured S3 client, creating it on first use.

 * @returns The configured S3 client.
 */
function client() {
  const { region } = storageConfig();
  if (!s3Client) {
    s3Client = new S3Client({
      region,
      ...(config.ROOM_IMAGE_S3_ENDPOINT
        ? { endpoint: config.ROOM_IMAGE_S3_ENDPOINT, forcePathStyle: true }
        : {}),
    });
  }
  return s3Client;
}

/**
 * Maps a supported image MIME type to its file extension.
 * @param contentType Declared image MIME type; must be JPEG, PNG, or WebP.
 * @returns The filename extension for the supplied supported MIME type.
 */
function extensionFor(contentType: RoomImageContentType) {
  return CONTENT_TYPE_EXTENSION[contentType];
}

/**
 * Checks whether a value is one of the supported room-image MIME types.
 * @param value String value to check against supported room-image content types.
 * @returns True when the value is a supported image MIME type; otherwise false.
 */
function isSupportedContentType(value: string): value is RoomImageContentType {
  return Object.prototype.hasOwnProperty.call(CONTENT_TYPE_EXTENSION, value);
}

/**
 * Validates the room and image metadata, then returns a signed upload URL and temporary object key.
 * @param roomId ID of the room whose image is being uploaded, attached, or removed.
 * @param contentType Declared image MIME type; must be JPEG, PNG, or WebP.
 * @param contentLength Declared image size in bytes, constrained by the upload size limit.
 * @returns A promise resolving to a signed upload URL, temporary object key, and upload requirements.
 */
export async function createRoomImageUpload(
  roomId: number,
  contentType: RoomImageContentType,
  contentLength: number,
) {
  const { bucket } = storageConfig();
  if (!isSupportedContentType(contentType)) {
    throw createHttpError('Image must be JPEG, PNG, or WebP', 400);
  }
  if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > MAX_ROOM_IMAGE_BYTES) {
    throw createHttpError(`Image must be between 1 byte and ${MAX_ROOM_IMAGE_BYTES} bytes`, 400);
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, isActive: true },
  });
  if (!room) throw createHttpError('Room not found', 404);
  if (!room.isActive) throw createHttpError('Cannot upload an image for an archived room', 409);

  const objectKey = `pending-room-images/${roomId}/${randomUUID()}.${extensionFor(contentType)}`;
  const uploadUrl = await getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        'room-id': String(roomId),
        'expected-size': String(contentLength),
      },
    }),
    { expiresIn: config.ROOM_IMAGE_UPLOAD_TTL_SECONDS },
  );

  return {
    objectKey,
    uploadUrl,
    expiresIn: config.ROOM_IMAGE_UPLOAD_TTL_SECONDS,
    headers: {
      'Content-Type': contentType,
    },
  };
}

/**
 * Creates the permanent storage key for an uploaded room image.
 * @param objectKey Temporary object key returned by the signed-upload operation.
 * @param roomId ID of the room whose image is being uploaded, attached, or removed.
 * @returns The permanent storage key for the uploaded room image.
 */
function permanentKeyForUpload(objectKey: string, roomId: number) {
  const match = PENDING_UPLOAD_KEY_PATTERN.exec(objectKey);
  if (!match || Number(match[1]) !== roomId) {
    throw createHttpError('Image upload key is invalid for this room', 400);
  }
  return `rooms/${roomId}/${match[2]}.${match[3].toLowerCase()}`;
}

/**
 * Checks the image file signature against the declared MIME type.
 * @param bytes Image file bytes inspected for a matching file signature.
 * @param contentType Declared image MIME type; must be JPEG, PNG, or WebP.
 * @returns True when the bytes begin with the signature expected for the MIME type; otherwise false.
 */
function hasExpectedSignature(bytes: Uint8Array, contentType: RoomImageContentType) {
  if (contentType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89
      && bytes[1] === 0x50
      && bytes[2] === 0x4e
      && bytes[3] === 0x47
      && bytes[4] === 0x0d
      && bytes[5] === 0x0a
      && bytes[6] === 0x1a
      && bytes[7] === 0x0a;
  }
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

/**
 * Deletes the specified object from the configured S3 bucket.
 * @param objectKey Temporary object key returned by the signed-upload operation.
 * @returns A promise resolving when the object has been deleted.
 */
async function removeObject(objectKey: string) {
  const { bucket } = storageConfig();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}

/**
 * Deletes a temporary uploaded object when later processing fails.
 * @param objectKey Temporary object key returned by the signed-upload operation.
 * @returns A promise resolving when the temporary object cleanup has completed.
 */
async function cleanupUploadedObject(objectKey: string) {
  try {
    await removeObject(objectKey);
  } catch (error) {
    logger.error('Failed to remove orphaned room image object from S3', { objectKey, error });
  }
}

/**
 * Deletes the previous stored image after a replacement is attached.
 * @param oldKey Previously attached object key to delete after replacement.
 * @param newKey New permanent object key that replaces the old image.
 * @returns A promise resolving when the old object has been deleted.
 */
async function deleteReplacedObject(oldKey: string | null, newKey: string | null) {
  if (!oldKey || oldKey === newKey) return;
  try {
    await removeObject(oldKey);
  } catch (error) {
    logger.error('Failed to delete replaced room image from S3', { objectKey: oldKey, error });
  }
}

/**
 * Validates the temporary object and attaches it to the room using a permanent storage key.
 * @param roomId ID of the room whose image is being uploaded, attached, or removed.
 * @param objectKey Temporary object key returned by the signed-upload operation.
 * @returns A promise resolving to the room after the uploaded image is attached.
 */
export async function attachRoomImage(roomId: number, objectKey: string) {
  const { bucket } = storageConfig();
  const permanentKey = permanentKeyForUpload(objectKey, roomId);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, isActive: true, imageKey: true },
  });
  if (!room) throw createHttpError('Room not found', 404);
  if (!room.isActive) throw createHttpError('Cannot attach an image to an archived room', 409);
  const s3 = client();
  let head;
  try {
    head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404 || (error as { name?: string })?.name === 'NotFound') {
      throw createHttpError('Uploaded image was not found in storage', 404);
    }
    throw error;
  }

  const contentType = head.ContentType;
  const expectedSize = Number(head.Metadata?.['expected-size']);
  const validType = contentType !== undefined && isSupportedContentType(contentType);
  const validSize = Number.isInteger(expectedSize)
    && expectedSize > 0
    && expectedSize <= MAX_ROOM_IMAGE_BYTES
    && head.ContentLength === expectedSize;
  const expectedExtension = validType ? extensionFor(contentType) : null;
  const keyExtension = objectKey.slice(objectKey.lastIndexOf('.') + 1).toLowerCase();
  const validMetadata = head.Metadata?.['room-id'] === String(roomId);

  let validSignature = false;
  if (validType && validSize && expectedExtension === keyExtension) {
    const object = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Range: 'bytes=0-11',
    }));
    const bytes = object.Body ? await object.Body.transformToByteArray() : new Uint8Array();
    validSignature = hasExpectedSignature(bytes, contentType);
  }

  if (!validType || !validSize || !validMetadata || expectedExtension !== keyExtension || !validSignature) {
    await cleanupUploadedObject(objectKey);
    throw createHttpError('Uploaded file is not a valid supported room image', 400);
  }

  const encodedSource = `${bucket}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  await s3.send(new CopyObjectCommand({
    Bucket: bucket,
    Key: permanentKey,
    CopySource: encodedSource,
    MetadataDirective: 'COPY',
  }));

  let updated: Room;
  try {
    updated = await prisma.room.update({
      where: { id: roomId },
      data: { imageKey: permanentKey, imageUrl: null },
    });
  } catch (error) {
    await cleanupUploadedObject(permanentKey);
    throw error;
  }
  await cleanupUploadedObject(objectKey);
  await deleteReplacedObject(room.imageKey, permanentKey);
  return serializeRoomImage(updated);
}

/**
 * Removes the room image reference and deletes its stored object.
 * @param roomId ID of the room whose image is being uploaded, attached, or removed.
 * @returns A promise resolving to the room after its image reference is removed.
 */
export async function removeRoomImage(roomId: number) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, imageKey: true },
  });
  if (!room) throw createHttpError('Room not found', 404);

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { imageKey: null, imageUrl: null },
  });
  await deleteReplacedObject(room.imageKey, null);
  return serializeRoomImage(updated);
}

/**
 * Returns the room with an image URL derived from its stored image key or legacy URL.
 * @param room Room record whose image URL is being serialized.
 * @returns A promise resolving to the room with its client-accessible image URL.
 */
export async function serializeRoomImage<T extends Pick<Room, 'imageKey' | 'imageUrl'>>(room: T) {
  const { imageKey, ...roomData } = room;
  if (!imageKey) return roomData;

  const { bucket } = storageConfig();
  const imageUrl = await getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucket, Key: imageKey }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
  return { ...roomData, imageUrl };
}

/**
 * Adds serialized image URLs to rooms nested in the booking.
 * @param booking Booking record whose related rooms receive serialized image URLs.
 * @returns A promise resolving to the booking with client-accessible image URLs on its rooms.
 */
export async function serializeBookingRoomImages<
  T extends { rooms: Array<{ room: Pick<Room, 'imageKey' | 'imageUrl'> }> },
>(booking: T) {
  const { rooms, ...bookingData } = booking;
  const serializedRooms = await Promise.all(
    rooms.map(async (roomLink) => ({
      ...roomLink,
      room: await serializeRoomImage(roomLink.room),
    })),
  );
  return { ...bookingData, rooms: serializedRooms };
}
