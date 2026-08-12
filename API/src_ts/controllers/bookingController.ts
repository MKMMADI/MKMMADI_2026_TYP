import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma';
import { createBooking } from '../services/bookingService';
import { createHttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/auth';

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
    const where = role === 'EMPLOYEE'
      ? { employeeId: req.user.id }
      : {};

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        rooms: { include: { room: true } },
        amenities: { include: { amenity: true } },
        employee: { select: { id: true, name: true, email: true } },
      },
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
      include: {
        rooms: { include: { room: true } },
        amenities: { include: { amenity: true } },
        employee: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      return next(createHttpError('Booking not found', 404));
    }

    if (req.user.role !== 'MANAGER' && req.user.role !== 'CLERK' && booking.employeeId !== req.user.id) {
      return next(createHttpError('Forbidden', 403));
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        rooms: { include: { room: true } },
        amenities: { include: { amenity: true } },
      },
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
    if (req.user.role !== 'MANAGER' && req.user.role !== 'CLERK' && booking.employeeId !== req.user.id) {
      return next(createHttpError('Forbidden', 403));
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
}
