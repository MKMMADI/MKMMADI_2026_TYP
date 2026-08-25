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
    const id = Number(req.params.id);
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
    const id = Number(req.params.id);
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
    const id = Number(req.params.id);
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
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!status) {
      return next(createHttpError('Status is required', 400));
    }

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return next(createHttpError('Booking not found', 404));
    }

    const data: Record<string, unknown> = { status };

    // When starting prep, claim the booking
    if (status === 'PREPARING') {
      data.preparedById = req.user.id;
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
    const id = Number(req.params.id);
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
