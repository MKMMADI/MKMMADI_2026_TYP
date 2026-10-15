/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Tests the roomImageService service behavior.
 */

const mockS3Send = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockFindRoom = jest.fn();
const mockUpdateRoom = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = mockS3Send;
  }
  class Command {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return {
    S3Client,
    CopyObjectCommand: Command,
    DeleteObjectCommand: Command,
    GetObjectCommand: Command,
    HeadObjectCommand: Command,
    PutObjectCommand: Command,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

jest.mock('../../src_ts/config', () => ({
  __esModule: true,
  default: {
    AWS_REGION: 'af-south-1',
    ROOM_IMAGE_S3_BUCKET: 'room-images-test',
    ROOM_IMAGE_S3_ENDPOINT: undefined,
    ROOM_IMAGE_UPLOAD_TTL_SECONDS: 300,
  },
}));

jest.mock('../../src_ts/prisma', () => ({
  __esModule: true,
  default: {
    room: {
      findUnique: (...args: unknown[]) => mockFindRoom(...args),
      update: (...args: unknown[]) => mockUpdateRoom(...args),
    },
  },
}));

jest.mock('../../src_ts/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

import {
  attachRoomImage,
  createRoomImageUpload,
  serializeBookingRoomImages,
  serializeRoomImage,
} from '../../src_ts/services/roomImageService';

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe('roomImageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue('https://s3.example.test/presigned');
  });

  it('returns a signed upload URL with the content type header for an active room', async () => {
    mockFindRoom.mockResolvedValue({ id: 12, isActive: true });

    const result = await createRoomImageUpload(12, 'image/jpeg', 6);

    expect(result.objectKey).toMatch(/^pending-room-images\/12\/[0-9a-f-]{36}\.jpg$/);
    expect(result.uploadUrl).toBe('https://s3.example.test/presigned');
    expect(result.headers).toEqual({
      'Content-Type': 'image/jpeg',
    });
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: expect.objectContaining({
        Bucket: 'room-images-test',
        ContentType: 'image/jpeg',
      }) }),
      { expiresIn: 300 },
    );
    expect(mockGetSignedUrl.mock.calls[0][1].input).toMatchObject({
      Bucket: 'room-images-test',
      ContentType: 'image/jpeg',
    });
  });

  it('rejects uploads for archived rooms', async () => {
    mockFindRoom.mockResolvedValue({ id: 12, isActive: false });

    await expect(createRoomImageUpload(12, 'image/jpeg', 6))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('verifies uploaded image bytes, attaches the new key, and removes the previous object', async () => {
    const objectKey = 'pending-room-images/12/123e4567-e89b-12d3-a456-426614174000.jpg';
    const permanentKey = 'rooms/12/123e4567-e89b-12d3-a456-426614174000.jpg';
    mockFindRoom.mockResolvedValue({ id: 12, isActive: true, imageKey: 'rooms/12/old.jpg' });
    mockUpdateRoom.mockResolvedValue({ id: 12, imageKey: permanentKey, imageUrl: null });
    mockS3Send
      .mockResolvedValueOnce({
        ContentType: 'image/jpeg',
        ContentLength: jpegBytes.length,
        Metadata: { 'room-id': '12', 'expected-size': String(jpegBytes.length) },
      })
      .mockResolvedValueOnce({ Body: { transformToByteArray: async () => jpegBytes } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const result = await attachRoomImage(12, objectKey);

    expect(result.imageUrl).toBe('https://s3.example.test/presigned');
    expect(mockUpdateRoom).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { imageKey: permanentKey, imageUrl: null },
    });
    expect(mockS3Send).toHaveBeenCalledTimes(5);
    expect(mockS3Send.mock.calls[0][0].input).toMatchObject({ Key: objectKey });
    expect(mockS3Send.mock.calls[1][0].input).toMatchObject({ Key: objectKey, Range: 'bytes=0-11' });
    expect(mockS3Send.mock.calls[2][0].input).toMatchObject({ Key: permanentKey, MetadataDirective: 'COPY' });
    expect(mockS3Send.mock.calls[3][0].input).toMatchObject({ Key: objectKey });
    expect(mockS3Send.mock.calls[4][0].input).toMatchObject({
      Bucket: 'room-images-test',
      Key: 'rooms/12/old.jpg',
    });
  });

  it('rejects and deletes uploads whose file signature does not match their declared type', async () => {
    const objectKey = 'pending-room-images/12/123e4567-e89b-12d3-a456-426614174000.jpg';
    mockFindRoom.mockResolvedValue({ id: 12, isActive: true, imageKey: null });
    mockS3Send
      .mockResolvedValueOnce({
        ContentType: 'image/jpeg',
        ContentLength: 4,
        Metadata: { 'room-id': '12', 'expected-size': '4' },
      })
      .mockResolvedValueOnce({ Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3, 4]) } })
      .mockResolvedValueOnce({});

    await expect(attachRoomImage(12, objectKey)).rejects.toMatchObject({ statusCode: 400 });

    expect(mockUpdateRoom).not.toHaveBeenCalled();
    expect(mockS3Send.mock.calls[2][0].input).toMatchObject({
      Bucket: 'room-images-test',
      Key: objectKey,
    });
  });

  it('returns an existing external image URL without signing it', async () => {
    const room = {
      imageKey: null,
      imageUrl: 'https://images.example.test/room.jpg',
    };

    await expect(serializeRoomImage(room)).resolves.toEqual({
      imageUrl: 'https://images.example.test/room.jpg',
    });
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('resolves images in nested booking room data without exposing object keys', async () => {
    const booking = {
      id: 41,
      rooms: [{
        roomId: 12,
        room: {
          id: 12,
          imageKey: null,
          imageUrl: 'https://images.example.test/room.jpg',
        },
      }],
    };

    await expect(serializeBookingRoomImages(booking)).resolves.toEqual({
      id: 41,
      rooms: [{
        roomId: 12,
        room: {
          id: 12,
          imageUrl: 'https://images.example.test/room.jpg',
        },
      }],
    });
  });
});
