/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements booking service domain operations and their persistence or integrations.
 */

import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';
import { Prisma, BookingStatus } from '@prisma/client';
import { publishBookingDisplacement } from './realtime';
import { isValidRejectionCode } from '../constants/rejectionReasons';
import { serializeBookingRoomImages } from './roomImageService';

//used to validate input
export interface CreateBookingInput {
  employeeId: number;
  purpose: string;
  startAt: string | Date;
  endAt: string | Date;
  roomIds: number[];
  amenityIds?: number[];
  capacity: number;
}

const bookingInclude = {
  rooms: { include: { room: true } },
  amenities: { include: { amenity: true } },
  employee: {
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      role: true,
      officialRole: true,
      department: true,
      contactNumber: true,
    },
  },
  displacedBookings: {
    select: {
      id: true,
      employeeId: true,
      purpose: true,
      startAt: true,
      endAt: true,
      status: true,
      suggestedStartAt: true,
      suggestedEndAt: true,
    },
  },
};

const bookingDetailsInclude = {
  rooms: { include: { room: { include: { amenities: { include: { amenity: true } } } } } },
  amenities: { include: { amenity: true } },
  employee: {
    select: {
      id: true, employeeId: true, name: true, email: true, role: true,
      department: true, contactNumber: true, officialRole: true,
    },
  },
  assignedClerk: { select: { id: true, name: true, email: true } },
  preparedBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
  displacedBy: { select: { id: true, purpose: true } },
  displacedBookings: {
    select: {
      id: true, employeeId: true, purpose: true, startAt: true, endAt: true,
      status: true, suggestedStartAt: true, suggestedEndAt: true,
    },
  },
} as const;

/**
 * Converts a date string or Date to a valid Date and throws a client error when parsing fails.
 * @param value Date string or Date instance to parse.
 * @param fieldName Field name to include in an invalid-date error.
 * @returns The parsed Date instance.
 */
function parseDate(value: string | Date, fieldName: string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(`Invalid ${fieldName}`, 400);
  }
  return parsed;
}

/**
 * Requires a non-empty array of unique positive integer room IDs.
 * @param roomIds Room IDs supplied for a booking; each must be a positive integer.
 * @returns The unique, validated room ID array.
 */
function normalizeRoomIds(roomIds: unknown) {
  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    throw createHttpError('At least one room is required', 400);
  }

  const normalizedRoomIds = Array.from(new Set(roomIds));
  if (normalizedRoomIds.some((roomId) => !Number.isInteger(roomId) || roomId <= 0)) {
    throw createHttpError('All rooms must be valid', 400);
  }

  return normalizedRoomIds;
}

/**
 * Requires capacity to be a positive whole number and returns it as a number.
 * @param capacity Requested attendee count; must be a positive whole number.
 * @returns The validated capacity as a number.
 */
function normalizeCapacity(capacity: unknown) {
  if (!Number.isInteger(capacity) || Number(capacity) <= 0) {
    throw createHttpError('Capacity must be a positive whole number', 400);
  }

  return Number(capacity);
}

/**
 * Searches the next 90 days in half-hour increments for a conflict-free replacement slot for the selected rooms.
 * @param tx Prisma transaction client used for booking-related database queries.
 * @param roomIds Room IDs that must all be free during the suggested slot.
 * @param originalStartAt Original requested booking start time; the search begins on the following day.
 * @param durationMs Length of the booking to preserve in the replacement slot.
 * @param excludedBookingIds Booking IDs excluded from conflict checks, such as displaced bookings.
 * @returns A promise resolving to the available replacement start and end times.
 */
async function findSuggestedSlot(
  tx: Prisma.TransactionClient,
  roomIds: number[],
  originalStartAt: Date,
  durationMs: number,
  excludedBookingIds: number[],
) {
  const firstCandidateDay = new Date(originalStartAt);
  firstCandidateDay.setUTCDate(firstCandidateDay.getUTCDate() + 1);
  firstCandidateDay.setUTCHours(0, 0, 0, 0);
  const bookings = await tx.booking.findMany({
    where: {
      id: { notIn: excludedBookingIds },
      status: { notIn: ['CANCELLED', 'COMPLETED', 'RESCHEDULE_REQUIRED'] },
      rooms: { some: { roomId: { in: roomIds } } },
      startAt: { lt: new Date(firstCandidateDay.getTime() + 90 * 24 * 60 * 60 * 1000) },
      endAt: { gt: firstCandidateDay },
    },
    select: { startAt: true, endAt: true, rooms: { select: { roomId: true } } },
  });

  for (let dayOffset = 1; dayOffset <= 90; dayOffset += 1) {
    const dayStart = new Date(originalStartAt);
    dayStart.setUTCDate(dayStart.getUTCDate() + dayOffset);
    dayStart.setUTCHours(originalStartAt.getUTCHours(), originalStartAt.getUTCMinutes(), 0, 0);

    for (let halfHour = 0; halfHour < 48; halfHour += 1) {
      const candidateStart = new Date(dayStart.getTime() + halfHour * 30 * 60 * 1000);
      const candidateEnd = new Date(candidateStart.getTime() + durationMs);
      const conflict = bookings.some((booking) =>
        booking.startAt < candidateEnd &&
        booking.endAt > candidateStart &&
        booking.rooms.some((link) => roomIds.includes(link.roomId)),
      );
      if (!conflict) return { startAt: candidateStart, endAt: candidateEnd };
    }
  }

  throw createHttpError('No future replacement time is available for the displaced booking', 409);
}

/**
 * Returns unique active amenity IDs and throws if any requested amenity is missing or inactive.
 * @param amenityIds Optional amenity IDs requested for the booking; each must refer to an active amenity.
 * @param tx Prisma transaction client used for booking-related database queries.
 * @returns A promise resolving to the unique active amenity IDs; an empty array when none were requested.
 */
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

/**
 * Validates the requested time, rooms, capacity, and amenities before creating the booking and any required displacement records.
 * @param input Employee ID, purpose, requested start/end, room IDs, optional amenity IDs, and attendee capacity.
 * @returns A promise resolving to the created booking and any displacement details.
 */
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
  const capacity = normalizeCapacity(input.capacity);

  const result = await prisma.$transaction(async (tx) => {
    const normalizedAmenityIds = await validateRequestedAmenities(input.amenityIds, tx);
    const user = await tx.user.findUnique({
      where: { id: input.employeeId },
      select: { id: true, role: true, officialRole: true },
    });
    if (!user) throw createHttpError('Booking user not found', 404);

    const rooms = await tx.room.findMany({
      where: { id: { in: roomIds }, isActive: true },
      include: { amenities: true },
    });

    if (rooms.length !== roomIds.length) {
      throw createHttpError('One or more selected rooms do not exist', 400);
    }

    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    if (totalCapacity < capacity) {
      throw createHttpError('Selected rooms do not provide enough capacity', 400);
    }

    for (const room of rooms) {
      if (room.status !== 'AVAILABLE') {
        throw createHttpError(`Room ${room.name} is not available for booking`, 400);
      }
      if (normalizedAmenityIds.length > 0) {
        const roomAmenityIds = room.amenities.map((item) => item.amenityId);
        const hasAllRequestedAmenities = normalizedAmenityIds.every((amenityId) => roomAmenityIds.includes(amenityId));
        if (!hasAllRequestedAmenities) {
          throw createHttpError(`Room ${room.name} does not support all requested amenities`, 400);
        }
      }
    }

    const overlappingBookings = await tx.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'COMPLETED', 'RESCHEDULE_REQUIRED'] },
        rooms: { some: { roomId: { in: roomIds } } },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      include: {
        employee: { select: { officialRole: true } },
        rooms: { select: { roomId: true } },
      },
    });

    const displacedBookings = overlappingBookings.filter(
      (booking) => booking.employeeId !== user.id && booking.employee.officialRole == null,
    );
    const nonDisplaceableBookings = overlappingBookings.filter(
      (booking) => !displacedBookings.some((displaced) => displaced.id === booking.id),
    );

    if (nonDisplaceableBookings.length > 0 || (overlappingBookings.length > 0 && user.officialRole == null)) {
      const conflictingRoomId = overlappingBookings
        .flatMap((booking) => booking.rooms.map((link) => link.roomId))
        .find((conflictingRoomId) => roomIds.includes(conflictingRoomId));
      const conflictingRoom = rooms.find((room) => room.id === conflictingRoomId);
      throw createHttpError(
        `Room ${conflictingRoom?.name ?? 'selected room'} is not available during the selected time`,
        400,
      );
    }

    const booking = await tx.booking.create({
      data: {
        employeeId: input.employeeId,
        purpose: input.purpose,
        startAt,
        endAt,
        status: user.officialRole == null ? BookingStatus.PENDING : BookingStatus.CONFIRMED,
        rooms: {
          create: roomIds.map((roomId) => ({ roomId, roomStatus: 'BOOKED' })),
        },
        amenities: {
          create: normalizedAmenityIds.map((amenityId) => ({ amenityId })),
        },
      },
      include: bookingInclude,
    });

    const displacedIds = displacedBookings.map((displaced) => displaced.id);
    for (const displaced of displacedBookings) {
      const displacedRoomIds = displaced.rooms.map((link) => link.roomId);
      const suggestion = await findSuggestedSlot(
        tx,
        displacedRoomIds,
        displaced.startAt,
        displaced.endAt.getTime() - displaced.startAt.getTime(),
        displacedIds,
      );
      await tx.booking.update({
        where: { id: displaced.id },
        data: {
          status: BookingStatus.RESCHEDULE_REQUIRED,
          statusBeforeDisplacement: displaced.status,
          suggestedStartAt: suggestion.startAt,
          suggestedEndAt: suggestion.endAt,
          displacedByBookingId: booking.id,
          preparedById: null,
        },
      });
    }

    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });

  for (const displaced of result.displacedBookings) {
    publishBookingDisplacement(displaced.employeeId, {
      bookingId: displaced.id,
      displacedByBookingId: result.id,
      suggestedStartAt: displaced.suggestedStartAt,
      suggestedEndAt: displaced.suggestedEndAt,
    });
  }

  return serializeBookingRoomImages(result);
}

/**
 * Accepts a suggested replacement time or finds a new available slot for the displaced booking.
 * @param input Booking and employee IDs, whether to accept the suggestion, and optional replacement start/end times.
 * @returns A promise resolving to the rescheduled booking and updated displacement records.
 */
export async function rescheduleDisplacedBooking(input: {
  bookingId: number;
  employeeId: number;
  acceptSuggestion: boolean;
  startAt?: string | Date;
  endAt?: string | Date;
}) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { rooms: { select: { roomId: true } } },
    });
    if (!booking) throw createHttpError('Booking not found', 404);
    if (booking.employeeId !== input.employeeId) throw createHttpError('Forbidden', 403);
    if (booking.status !== BookingStatus.RESCHEDULE_REQUIRED) {
      throw createHttpError('This booking does not need rescheduling', 400);
    }

    const startAt = input.acceptSuggestion
      ? booking.suggestedStartAt
      : input.startAt !== undefined
        ? parseDate(input.startAt, 'startAt')
        : null;
    const endAt = input.acceptSuggestion
      ? booking.suggestedEndAt
      : input.endAt !== undefined
        ? parseDate(input.endAt, 'endAt')
        : startAt
          ? new Date(startAt.getTime() + booking.endAt.getTime() - booking.startAt.getTime())
          : null;
    if (!startAt || !endAt) {
      throw createHttpError('A valid replacement startAt is required', 400);
    }
    if (endAt <= startAt) throw createHttpError('Meeting end time must be after the start time', 400);
    if (startAt < new Date()) throw createHttpError('Bookings cannot start in the past', 400);
    if (endAt.getTime() - startAt.getTime() !== booking.endAt.getTime() - booking.startAt.getTime()) {
      throw createHttpError('A replacement booking must keep the original duration', 400);
    }

    const roomIds = booking.rooms.map((link) => link.roomId);
    const conflict = await tx.booking.findFirst({
      where: {
        id: { not: booking.id },
        status: { notIn: ['CANCELLED', 'COMPLETED', 'RESCHEDULE_REQUIRED'] },
        rooms: { some: { roomId: { in: roomIds } } },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (conflict) {
      throw createHttpError('The selected replacement time is no longer available', 409);
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        startAt,
        endAt,
        status: booking.statusBeforeDisplacement ?? BookingStatus.PENDING,
        statusBeforeDisplacement: null,
        suggestedStartAt: null,
        suggestedEndAt: null,
      },
    });

    return tx.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  });
  return serializeBookingRoomImages(result);
}

/**
 * Returns active rooms available for the requested time range, capacity, and amenity set.
 * @param options Optional start/end times, minimum capacity, and amenity IDs used to find available rooms.
 * @returns A promise resolving to rooms that satisfy the requested availability criteria.
 */
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
          status: { notIn: ['CANCELLED', 'COMPLETED', 'RESCHEDULE_REQUIRED'] },
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

/**
 * Returns bookings visible to the requested role and user, optionally filtered by status.
 * @param role Role used to determine which bookings the caller may see.
 * @param userId Current user ID; employee-role results are restricted to bookings owned by this user.
 * @param statusParam Optional comma-separated booking statuses by which to filter results.
 * @returns A promise resolving to the bookings permitted by the role, user, and status filter.
 */
export async function listBookings(role: string | undefined, userId: number, statusParam?: string) {
  const where: Record<string, unknown> = role === 'EMPLOYEE' ? { employeeId: userId } : {};
  if (statusParam) {
    const statuses = statusParam.split(',').map((status) => status.trim()).filter(Boolean);
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
  }
  const bookings = await prisma.booking.findMany({ where, include: bookingDetailsInclude, orderBy: { createdAt: 'desc' } });
  return Promise.all(bookings.map((booking) => serializeBookingRoomImages(booking)));
}

/**
 * Returns active clerk accounts eligible for booking assignment.

 * @returns A promise resolving to active clerk user records eligible for assignment.
 */
export function listAssignableClerks() {
  return prisma.user.findMany({
    where: { role: 'CLERK', Active: true },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
}

/**
 * Assigns the booking to a clerk or clears its clerk assignment when clerkId is null.
 * @param id ID of the booking to assign or unassign.
 * @param clerkId ID of the clerk to assign, or null to remove the current clerk assignment.
 * @returns A promise resolving to the updated booking and assigned clerk, if any.
 */
export async function assignBookingClerk(id: number, clerkId: number | null) {
  const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!booking) throw createHttpError('Booking not found', 404);
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
    throw createHttpError('Closed bookings cannot be assigned', 400);
  }
  if (clerkId !== null) {
    const clerk = await prisma.user.findFirst({
      where: { id: clerkId, role: 'CLERK', Active: true }, select: { id: true },
    });
    if (!clerk) throw createHttpError('Active clerk not found', 404);
  }
  const updated = await prisma.booking.update({ where: { id }, data: { assignedClerkId: clerkId }, include: bookingDetailsInclude });
  return serializeBookingRoomImages(updated);
}

/**
 * Returns booking details when the user’s role and ownership permit access.
 * @param id ID of the booking to retrieve.
 * @param userId ID of the user requesting booking details.
 * @param role User role used to select behavior or permissions.
 * @returns A promise resolving to booking details visible to the specified user.
 */
export async function getBooking(id: number, userId: number, role: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingDetailsInclude });
  if (!booking) throw createHttpError('Booking not found', 404);
  if (role !== 'MANAGER' && role !== 'CLERK' && booking.employeeId !== userId) {
    throw createHttpError('Forbidden', 403);
  }
  return serializeBookingRoomImages(booking);
}

/**
 * Approves the booking as the specified reviewer and returns its updated details.
 * @param id ID of the booking to approve.
 * @param reviewerId ID of the user performing the booking review.
 * @returns A promise resolving to the approved booking details.
 */
export async function approveBooking(id: number, reviewerId: number) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw createHttpError('Booking not found', 404);
  if (existing.status !== 'PENDING') throw createHttpError('Only pending bookings can be approved', 400);
  await prisma.booking.update({
    where: { id },
    data: {
      status: 'CONFIRMED', reviewedById: reviewerId, reviewedAt: new Date(),
      rejectionReasonCode: null, rejectionNote: null,
    },
  });
  const updated = await prisma.booking.findUniqueOrThrow({ where: { id }, include: bookingDetailsInclude });
  return serializeBookingRoomImages(updated);
}

/**
 * Rejects the booking with a standard reason code and optional note, then returns its updated details.
 * @param id ID of the booking to reject.
 * @param reviewerId ID of the user performing the booking review.
 * @param reasonCode Supported rejection code explaining why the booking was rejected.
 * @param note Optional additional explanation accompanying the rejection.
 * @returns A promise resolving to the rejected booking details.
 */
export async function rejectBooking(id: number, reviewerId: number, reasonCode: string, note?: string) {
  if (!reasonCode || !isValidRejectionCode(reasonCode)) {
    throw createHttpError('A valid rejection reasonCode is required', 400);
  }
  if (reasonCode === 'OTHER' && !(note && String(note).trim())) {
    throw createHttpError('A note is required when reason is OTHER', 400);
  }
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw createHttpError('Booking not found', 404);
  if (existing.status !== 'PENDING') throw createHttpError('Only pending bookings can be rejected', 400);
  await prisma.booking.update({
    where: { id },
    data: {
      status: 'CANCELLED', rejectionReasonCode: reasonCode, rejectionNote: note?.trim() || null,
      reviewedById: reviewerId, reviewedAt: new Date(),
    },
  });
  const updated = await prisma.booking.findUniqueOrThrow({ where: { id }, include: bookingDetailsInclude });
  return serializeBookingRoomImages(updated);
}

const preparationStatuses = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

/**
 * Applies an allowed status transition by the specified user and returns the updated booking.
 * @param id ID of the booking whose status should change.
 * @param status Requested booking status; must be a transition permitted for the user.
 * @param userId ID of the user requesting the status transition.
 * @returns A promise resolving to the booking after its status transition.
 */
export async function updateBookingStatus(id: number, status: string, userId: number) {
  if (!status) throw createHttpError('Status is required', 400);
  if (!preparationStatuses.includes(status)) {
    throw createHttpError('Invalid preparation status. Allowed: CONFIRMED, PREPARING, READY, COMPLETED', 400);
  }
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw createHttpError('Booking not found', 404);
  if (!preparationStatuses.includes(existing.status)) {
    throw createHttpError('Only confirmed or in-preparation bookings can have preparation status changed', 400);
  }
  const data: Record<string, unknown> = { status };
  if (status === 'PREPARING') data.preparedById = userId;
  if (status === 'CONFIRMED') data.preparedById = null;
  await prisma.booking.update({ where: { id }, data });
  const updated = await prisma.booking.findUniqueOrThrow({ where: { id }, include: bookingDetailsInclude });
  return serializeBookingRoomImages(updated);
}

/**
 * Cancels the booking when permitted for the user and role, returning its updated details.
 * @param id ID of the booking to cancel.
 * @param userId ID of the user requesting cancellation.
 * @param role Role of the user requesting cancellation.
 * @returns A promise resolving to the cancelled booking details.
 */
export async function cancelBooking(id: number, userId: number, role: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw createHttpError('Booking not found', 404);
  if (role !== 'MANAGER' && role !== 'CLERK' && booking.employeeId !== userId) {
    throw createHttpError('Forbidden', 403);
  }
  const staffOverride = role === 'MANAGER' || role === 'CLERK';
  if (!staffOverride) {
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw createHttpError('This booking can no longer be cancelled', 400);
    }
    if (booking.status !== 'PENDING' && new Date(booking.startAt).getTime() - Date.now() < 6 * 60 * 60 * 1000) {
      throw createHttpError('Approved bookings can only be cancelled at least 6 hours before the start time', 400);
    }
  }
  await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
  const updated = await prisma.booking.findUniqueOrThrow({ where: { id }, include: bookingDetailsInclude });
  return serializeBookingRoomImages(updated);
}

/**
 * Returns room occupancy windows within the optional date bounds without personal information.
 * @param fromValue Optional start date/time for the occupancy interval.
 * @param toValue Optional end date/time for the occupancy interval.
 * @returns A promise resolving to room occupancy intervals without personal information.
 */
export async function listOccupancy(fromValue?: string, toValue?: string) {
  const from = fromValue ? new Date(fromValue) : new Date();
  const to = toValue ? new Date(toValue) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    throw createHttpError('Invalid from/to range', 400);
  }
  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'COMPLETED', 'RESCHEDULE_REQUIRED'] },
      startAt: { lt: to }, endAt: { gt: from },
    },
    select: { id: true, startAt: true, endAt: true, status: true, rooms: { select: { roomId: true } } },
    orderBy: { startAt: 'asc' },
  });
  return bookings.flatMap((booking) => booking.rooms.map((room) => ({
    bookingId: booking.id, roomId: room.roomId, startAt: booking.startAt,
    endAt: booking.endAt, status: booking.status,
  })));
}
