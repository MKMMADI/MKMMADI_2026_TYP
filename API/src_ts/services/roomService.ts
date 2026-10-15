/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements room service domain operations and their persistence or integrations.
 */

import { RoomStatus } from '@prisma/client';
import prisma from '../prisma';
import { listAvailableRooms } from './bookingService';
import { serializeRoomImage } from './roomImageService';
import { createHttpError } from '../utils/httpError';

const roomInclude = { amenities: { include: { amenity: true } } } as const;


/**
 * Replaces each room-amenity join record with its nested amenity object.
 * @param room Room record with amenity join records to flatten.
 * @returns The room object with amenities converted from join records to amenity records.
 */
function flattenAmenities<T extends { amenities: { amenity: unknown }[] }>(room: T) {
  return { ...room, amenities: room.amenities.map((item) => item.amenity) };
}

/**
 * Returns active rooms with flattened amenities and serialized image URLs, ordered newest first.

 * @returns A promise resolving to the active rooms, ordered by creation time, with flattened amenities and serialized image URLs.
 */
export async function listRooms() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: roomInclude,
    orderBy: { createdAt: 'desc' },
  });
  return Promise.all(rooms.map((room) => serializeRoomImage(flattenAmenities(room))));
}

/**
 * Creates a room and its amenity links, then returns the room with a serialized image URL.
 * @param input Room name, capacity, and optional description, status, image URL, active flag, and amenity IDs.
 * @returns A promise resolving to the created room with flattened amenities and a serialized image URL.
 */
export async function createRoom(input: {
  name?: string;
  description?: string;
  imageUrl?: string | null;
  capacity?: unknown;
  status?: string;
  isActive?: boolean;
  amenityIds?: number[];
}) {
  const { name, description, imageUrl, capacity, status = 'AVAILABLE', isActive = true, amenityIds = [] } = input;
  if (!name || !capacity) throw createHttpError('Name and capacity are required', 400);
  const room = await prisma.room.create({
    data: {
      name,
      description,
      imageUrl,
      imageKey: null,
      capacity: Number(capacity),
      status: status as RoomStatus,
      isActive,
      amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
    },
    include: roomInclude,
  });
  return serializeRoomImage(flattenAmenities(room));
}

/**
 * Validates the room ID and returns that room with flattened amenities and a serialized image URL.
 * @param id Positive integer ID of the room to retrieve.
 * @returns A promise resolving to the requested room with flattened amenities and a serialized image URL.
 */
export async function getRoom(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  const room = await prisma.room.findUnique({ where: { id }, include: roomInclude });
  if (!room) throw createHttpError('Room not found', 404);
  return serializeRoomImage(flattenAmenities(room));
}

/**
 * Applies supplied room fields and replaces amenity links when provided, then returns the refreshed room.
 * @param id Positive integer ID of the room to update.
 * @param input Optional room fields to update; amenityIds, when supplied, replaces existing room-amenity links.
 * @returns A promise resolving to the refreshed room with flattened amenities and a serialized image URL, or null if it no longer exists.
 */
export async function updateRoom(
  id: number,
  input: { name?: string; description?: string; imageUrl?: string | null; capacity?: unknown; status?: string; isActive?: boolean; amenityIds?: number[] },
) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  if (!(await prisma.room.findUnique({ where: { id } }))) throw createHttpError('Room not found', 404);
  const { name, description, imageUrl, capacity, status, isActive, amenityIds } = input;
  await prisma.room.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(imageUrl !== undefined ? { imageUrl, imageKey: null } : {}),
      ...(capacity !== undefined ? { capacity: Number(capacity) } : {}),
      ...(status !== undefined ? { status: status as RoomStatus } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: roomInclude,
  });
  if (amenityIds) {
    await prisma.roomAmenity.deleteMany({ where: { roomId: id } });
    await prisma.roomAmenity.createMany({ data: amenityIds.map((amenityId) => ({ roomId: id, amenityId })) });
  }
  const refreshed = await prisma.room.findUnique({ where: { id }, include: roomInclude });
  return refreshed ? serializeRoomImage(flattenAmenities(refreshed)) : null;
}

/**
 * Marks a room inactive while preserving its record and booking history.
 * @param id Positive integer ID of the room to mark inactive.
 * @returns A promise resolving to the inactive room with its serialized image URL.
 */
export async function archiveRoom(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  if (!(await prisma.room.findUnique({ where: { id } }))) throw createHttpError('Room not found', 404);
  const room = await prisma.room.update({ where: { id }, data: { isActive: false } });
  return serializeRoomImage(room);
}

/**
 * Validates and applies an operational room status, then returns the room with its image URL.
 * @param id Positive integer ID of the room whose status will change.
 * @param rawStatus Requested status; must be AVAILABLE, OUT_OF_SERVICE, or MAINTENANCE.
 * @returns A promise resolving to the room with its updated status and serialized image URL.
 */
export async function updateRoomStatus(id: number, rawStatus: unknown) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  if (!['AVAILABLE', 'OUT_OF_SERVICE', 'MAINTENANCE'].includes(String(rawStatus))) {
    throw createHttpError('Status must be AVAILABLE, OUT_OF_SERVICE, or MAINTENANCE', 400);
  }
  const room = await prisma.room.update({ where: { id }, data: { status: rawStatus as RoomStatus } });
  return serializeRoomImage(room);
}

/**
 * Finds available rooms matching the time, capacity, and amenity criteria and serializes their image URLs.
 * @param input Requested start and end times, minimum capacity, and amenity IDs.
 * @returns A promise resolving to the available rooms with serialized image URLs.
 */
export async function searchAvailability(input: {
  startAt: string;
  endAt: string;
  capacity: number;
  amenityIds: string[];
}) {
  const rooms = await listAvailableRooms(input);
  return Promise.all(rooms.map((room) => serializeRoomImage(room)));
}
