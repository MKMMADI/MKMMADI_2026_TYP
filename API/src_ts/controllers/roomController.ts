import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';
import { listAvailableRooms } from '../services/bookingService';

export async function listRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      include: { amenities: { include: { amenity: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(rooms.map((room) => ({
      ...room,
      amenities: room.amenities.map((item) => item.amenity),
    })));
  } catch (error) {
    next(error);
  }
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, capacity, status = 'AVAILABLE', isActive = true, amenityIds = [] } = req.body;
    if (!name || !capacity) {
      return next(createHttpError('Name and capacity are required', 400));
    }

    const room = await prisma.room.create({
      data: {
        name,
        description,
        capacity: Number(capacity),
        status,
        isActive,
        amenities: {
          create: amenityIds.map((amenityId: number) => ({ amenityId })),
        },
      },
      include: { amenities: { include: { amenity: true } } },
    });

    res.status(201).json({
      ...room,
      amenities: room.amenities.map((item) => item.amenity),
    });
  } catch (error) {
    next(error);
  }
}

export async function getRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const room = await prisma.room.findUnique({
      where: { id },
      include: { amenities: { include: { amenity: true } } },
    });
    if (!room) {
      return next(createHttpError('Room not found', 404));
    }
    res.json({
      ...room,
      amenities: room.amenities.map((item) => item.amenity),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { name, description, capacity, status, isActive, amenityIds } = req.body;

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(capacity !== undefined ? { capacity: Number(capacity) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: { amenities: { include: { amenity: true } } },
    });

    if (amenityIds) {
      await prisma.roomAmenity.deleteMany({ where: { roomId: id } });
      await prisma.roomAmenity.createMany({
        data: amenityIds.map((amenityId: number) => ({ roomId: id, amenityId })),
      });
    }

    const refreshedRoom = await prisma.room.findUnique({
      where: { id },
      include: { amenities: { include: { amenity: true } } },
    });

    res.json({
      ...refreshedRoom,
      amenities: refreshedRoom?.amenities.map((item) => item.amenity),
    });
  } catch (error) {
    next(error);
  }
}

export async function archiveRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const room = await prisma.room.update({
      where: { id },
      data: { isActive: false },
    });
    res.json(room);
  } catch (error) {
    next(error);
  }
}

export async function searchAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await listAvailableRooms({
      startAt: req.query.startAt as string,
      endAt: req.query.endAt as string,
      capacity: req.query.capacity ? Number(req.query.capacity) : 0,
      amenityIds: typeof req.query.amenityIds === 'string' ? req.query.amenityIds.split(',') : [],
    });

    res.json(rooms);
  } catch (error) {
    next(error);
  }
}


/** Occupancy windows across rooms (no employee PII). */
export async function listRoomOccupancy(req: Request, res: Response, next: NextFunction) {
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
