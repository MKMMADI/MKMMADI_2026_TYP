import { RoomStatus } from '@prisma/client';
import prisma from '../prisma';
import { listAvailableRooms } from './bookingService';
import { createHttpError } from '../utils/httpError';

const roomInclude = { amenities: { include: { amenity: true } } } as const;

function flattenAmenities<T extends { amenities: { amenity: unknown }[] }>(room: T) {
  return { ...room, amenities: room.amenities.map((item) => item.amenity) };
}

export async function listRooms() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: roomInclude,
    orderBy: { createdAt: 'desc' },
  });
  return rooms.map(flattenAmenities);
}

export async function createRoom(input: {
  name?: string;
  description?: string;
  capacity?: unknown;
  status?: string;
  isActive?: boolean;
  amenityIds?: number[];
}) {
  const { name, description, capacity, status = 'AVAILABLE', isActive = true, amenityIds = [] } = input;
  if (!name || !capacity) throw createHttpError('Name and capacity are required', 400);
  const room = await prisma.room.create({
    data: {
      name,
      description,
      capacity: Number(capacity),
      status: status as RoomStatus,
      isActive,
      amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) },
    },
    include: roomInclude,
  });
  return flattenAmenities(room);
}

export async function getRoom(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  const room = await prisma.room.findUnique({ where: { id }, include: roomInclude });
  if (!room) throw createHttpError('Room not found', 404);
  return flattenAmenities(room);
}

export async function updateRoom(
  id: number,
  input: { name?: string; description?: string; capacity?: unknown; status?: string; isActive?: boolean; amenityIds?: number[] },
) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  if (!(await prisma.room.findUnique({ where: { id } }))) throw createHttpError('Room not found', 404);
  const { name, description, capacity, status, isActive, amenityIds } = input;
  await prisma.room.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
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
  return refreshed ? flattenAmenities(refreshed) : null;
}

export async function archiveRoom(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  if (!(await prisma.room.findUnique({ where: { id } }))) throw createHttpError('Room not found', 404);
  return prisma.room.update({ where: { id }, data: { isActive: false } });
}

export async function updateRoomStatus(id: number, rawStatus: unknown) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  if (!['AVAILABLE', 'OUT_OF_SERVICE', 'MAINTENANCE'].includes(String(rawStatus))) {
    throw createHttpError('Status must be AVAILABLE, OUT_OF_SERVICE, or MAINTENANCE', 400);
  }
  return prisma.room.update({ where: { id }, data: { status: rawStatus as RoomStatus } });
}

export async function searchAvailability(input: {
  startAt: string;
  endAt: string;
  capacity: number;
  amenityIds: string[];
}) {
  return listAvailableRooms(input);
}
