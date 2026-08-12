import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';
import { Prisma, BookingStatus } from '@prisma/client';

export interface CreateBookingInput {
  employeeId: number;
  purpose: string;
  startAt: string | Date;
  endAt: string | Date;
  roomIds: number[];
  amenityIds?: number[];
  capacity: number;
}

function parseDate(value: string | Date, fieldName: string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(`Invalid ${fieldName}`, 400);
  }
  return parsed;
}

function normalizeRoomIds(roomIds: number[]) {
  const uniqueIds = Array.from(new Set(roomIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) {
    throw createHttpError('At least one room is required', 400);
  }
  return uniqueIds;
}

async function validateRequestedAmenities(amenityIds: number[] | undefined, tx: Prisma.TransactionClient) {
  if (!amenityIds || amenityIds.length === 0) {
    return [];
  }

  const uniqueAmenityIds = Array.from(new Set(amenityIds));
  const amenities = await tx.amenity.findMany({ where: { id: { in: uniqueAmenityIds }, isActive: true } });
  if (amenities.length !== uniqueAmenityIds.length) {
    throw createHttpError('One or more requested amenities do not exist', 400);
  }

  return uniqueAmenityIds;
}

export async function createBooking(input: CreateBookingInput) {
  const startAt = parseDate(input.startAt, 'startAt');
  const endAt = parseDate(input.endAt, 'endAt');

  if (endAt <= startAt) {
    throw createHttpError('Meeting end time must be after the start time', 400);
  }

  if (startAt < new Date()) {
    throw createHttpError('Bookings cannot start in the past', 400);
  }

  const roomIds = normalizeRoomIds(input.roomIds);

  return prisma.$transaction(async (tx) => {
    const normalizedAmenityIds = await validateRequestedAmenities(input.amenityIds, tx);

    const rooms = await tx.room.findMany({
      where: { id: { in: roomIds }, isActive: true },
      include: { amenities: true },
    });

    if (rooms.length !== roomIds.length) {
      throw createHttpError('One or more selected rooms do not exist', 400);
    }

    for (const room of rooms) {
      if (room.status !== 'AVAILABLE') {
        throw createHttpError(`Room ${room.name} is not available for booking`, 400);
      }
      if (room.capacity < input.capacity) {
        throw createHttpError(`Room ${room.name} is too small for the requested capacity`, 400);
      }
      if (normalizedAmenityIds.length > 0) {
        const roomAmenityIds = room.amenities.map((item) => item.amenityId);
        const hasAllRequestedAmenities = normalizedAmenityIds.every((amenityId) => roomAmenityIds.includes(amenityId));
        if (!hasAllRequestedAmenities) {
          throw createHttpError(`Room ${room.name} does not support all requested amenities`, 400);
        }
      }

      const overlappingBookings = await tx.booking.findMany({
        where: {
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
          rooms: { some: { roomId: room.id } },
          AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
        },
        select: { id: true },
      });

      if (overlappingBookings.length > 0) {
        throw createHttpError(`Room ${room.name} is not available during the selected time`, 400);
      }
    }

    const booking = await tx.booking.create({
      data: {
        employeeId: input.employeeId,
        purpose: input.purpose,
        startAt,
        endAt,
        status: BookingStatus.CONFIRMED,
        rooms: {
          create: roomIds.map((roomId) => ({ roomId, roomStatus: 'BOOKED' })),
        },
        amenities: {
          create: normalizedAmenityIds.map((amenityId) => ({ amenityId })),
        },
      },
      include: {
        rooms: { include: { room: true } },
        amenities: { include: { amenity: true } },
      },
    });

    return booking;
  });
}

export async function listAvailableRooms(options: {
  startAt?: string | Date;
  endAt?: string | Date;
  capacity?: number;
  amenityIds?: string[];
}) {
  const startAt = options.startAt ? parseDate(options.startAt, 'startAt') : undefined;
  const endAt = options.endAt ? parseDate(options.endAt, 'endAt') : undefined;

  if (startAt && endAt && endAt <= startAt) {
    throw createHttpError('End time must be after start time', 400);
  }

  const requestedCapacity = options.capacity ? Number(options.capacity) : 0;
  const requestedAmenityIds = (options.amenityIds || []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);

  const rooms = await prisma.room.findMany({
    where: {
      isActive: true,
      status: 'AVAILABLE',
      capacity: { gte: requestedCapacity },
    },
    include: { amenities: { include: { amenity: true } } },
  });

  const filteredRooms = [] as Array<{ room: typeof rooms[number]; hasConflict: boolean }>;

  for (const room of rooms) {
    if (requestedAmenityIds.length > 0) {
      const roomAmenityIds = room.amenities.map((item) => item.amenityId);
      const hasAllAmenities = requestedAmenityIds.every((amenityId) => roomAmenityIds.includes(amenityId));
      if (!hasAllAmenities) {
        continue;
      }
    }

    if (startAt && endAt) {
      const conflictingBookings = await prisma.booking.findMany({
        where: {
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
          rooms: { some: { roomId: room.id } },
          AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
        },
        select: { id: true },
      });

      if (conflictingBookings.length > 0) {
        continue;
      }
    }

    filteredRooms.push({ room, hasConflict: false });
  }

  return filteredRooms.map((item) => ({
    ...item.room,
    amenities: item.room.amenities.map((amenityLink) => amenityLink.amenity),
  }));
}
