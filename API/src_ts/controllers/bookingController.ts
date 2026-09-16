import { NextFunction, Response } from 'express';
import prisma from '../prisma';
import { createBooking } from '../services/bookingService';
import { createHttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/auth';
import { isValidRejectionCode, REJECTION_REASONS } from '../constants/rejectionReasons';

const bookingInclude = {
  rooms: { include: { room: true } },
  amenities: { include: { amenity: true } },
  employee: { select: { id: true, name: true, email: true } },
  preparedBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
} as const;

/** Statuses clerks may set on the preparation queue (including moving backwards). */
const PREP_STATUSES = new Set(['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']);


function parseBookingId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function createBookingHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const booking = await createBooking({
      employeeId: req.user?.id,
      purpose: req.body.purpose,
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      roomIds: req.body.roomIds,
      amenityIds: req.body.amenityIds,
      capacity: Number(req.body.capacity || 0),
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
}

export async function listBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const role = req.user?.role;
    const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where: Record<string, unknown> =
      role === 'EMPLOYEE' ? { employeeId: req.user.id } : {};

    if (statusParam) {
      const statuses = statusParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) where.status = statuses[0];
      else if (statuses.length > 1) where.status = { in: statuses };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) {
      return next(createHttpError('Invalid booking id', 400));
    }
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });

    if (!booking) {
      return next(createHttpError('Booking not found', 404));
    }

    if (
      req.user.role !== 'MANAGER' &&
      req.user.role !== 'CLERK' &&
      booking.employeeId !== req.user.id
    ) {
      return next(createHttpError('Forbidden', 403));
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function listRejectionReasons(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(REJECTION_REASONS);
  } catch (error) {
    next(error);
  }
}

export async function approveBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) {
      return next(createHttpError('Invalid booking id', 400));
    }
    const existing = await prisma.booking.findUnique({ where: { id } });

    if (!existing) {
      return next(createHttpError('Booking not found', 404));
    }
    if (existing.status !== 'PENDING') {
      return next(createHttpError('Only pending bookings can be approved', 400));
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        reviewedById: req.user.id,
        reviewedAt: new Date(),
        rejectionReasonCode: null,
        rejectionNote: null,
      },
      include: bookingInclude,
    });

    // TODO: notify employee (email / in-app notification)
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function rejectBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) {
      return next(createHttpError('Invalid booking id', 400));
    }
    const { reasonCode, note } = req.body as { reasonCode?: string; note?: string };

    if (!reasonCode || !isValidRejectionCode(reasonCode)) {
      return next(createHttpError('A valid rejection reasonCode is required', 400));
    }
    if (reasonCode === 'OTHER' && !(note && String(note).trim())) {
      return next(createHttpError('A note is required when reason is OTHER', 400));
    }

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return next(createHttpError('Booking not found', 404));
    }
    if (existing.status !== 'PENDING') {
      return next(createHttpError('Only pending bookings can be rejected', 400));
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        rejectionReasonCode: reasonCode,
        rejectionNote: note?.trim() || null,
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      },
      include: bookingInclude,
    });

    // TODO: notify employee with reason
    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) {
      return next(createHttpError('Invalid booking id', 400));
    }
    const { status } = req.body as { status?: string };

    if (!status) {
      return next(createHttpError('Status is required', 400));
    }

    if (!PREP_STATUSES.has(status)) {
      return next(
        createHttpError(
          'Invalid preparation status. Allowed: CONFIRMED, PREPARING, READY, COMPLETED',
          400
        )
      );
    }

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return next(createHttpError('Booking not found', 404));
    }

    // Queue work only on confirmed/prep pipeline (not PENDING / CANCELLED)
    const fromAllowed = PREP_STATUSES.has(existing.status) || existing.status === 'CONFIRMED';
    if (!fromAllowed && existing.status !== 'CONFIRMED') {
      // CONFIRMED is in PREP_STATUSES; also allow if already in pipeline
      if (!['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'].includes(existing.status)) {
        return next(
          createHttpError(
            'Only confirmed or in-preparation bookings can have preparation status changed',
            400
          )
        );
      }
    }

    if (!['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'].includes(existing.status)) {
      return next(
        createHttpError(
          'Only confirmed or in-preparation bookings can have preparation status changed',
          400
        )
      );
    }

    const data: Record<string, unknown> = { status };

    // When starting (or re-starting) prep, claim the booking
    if (status === 'PREPARING') {
      data.preparedById = req.user.id;
    }

    // Moving back from READY/PREPARING to CONFIRMED clears claim
    if (status === 'CONFIRMED') {
      data.preparedById = null;
    }

    const booking = await prisma.booking.update({
      where: { id },
      data,
      include: bookingInclude,
    });

    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) {
      return next(createHttpError('Invalid booking id', 400));
    }
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return next(createHttpError('Booking not found', 404));
    }
    if (
      req.user.role !== 'MANAGER' &&
      req.user.role !== 'CLERK' &&
      booking.employeeId !== req.user.id
    ) {
      return next(createHttpError('Forbidden', 403));
    }

    // Employees may always cancel PENDING. For approved pipeline statuses they need ≥6 hours before start.
    const staffOverride = req.user.role === 'MANAGER' || req.user.role === 'CLERK';
    if (!staffOverride) {
      if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
        return next(createHttpError('This booking can no longer be cancelled', 400));
      }
      if (booking.status !== 'PENDING') {
        const msUntilStart = new Date(booking.startAt).getTime() - Date.now();
        const sixHoursMs = 6 * 60 * 60 * 1000;
        if (msUntilStart < sixHoursMs) {
          return next(
            createHttpError(
              'Approved bookings can only be cancelled at least 6 hours before the start time',
              400,
            ),
          );
        }
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: bookingInclude,
    });

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
}

/** Occupancy windows for all rooms (no PII) — used by employee home availability. */
export async function listOccupancy(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date();
    const to = req.query.to
      ? new Date(String(req.query.to))
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      return next(createHttpError('Invalid from/to range', 400));
    }

    const bookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        rooms: { select: { roomId: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    const slots = bookings.flatMap((b) =>
      b.rooms.map((r) => ({
        bookingId: b.id,
        roomId: r.roomId,
        startAt: b.startAt,
        endAt: b.endAt,
        status: b.status,
      })),
    );

    res.json(slots);
  } catch (error) {
    next(error);
  }
}
