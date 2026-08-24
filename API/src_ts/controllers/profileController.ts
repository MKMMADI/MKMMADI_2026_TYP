// API/src/controllers/profileController.ts
import { NextFunction, Response } from 'express';
import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/auth';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        contactNumber: true,
        createdAt: true,
        updatedAt: true,
        Active: true,
      }
    });
    
    if (!user) {
      return next(createHttpError('User not found', 404));
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;
    const { name, department, contactNumber } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(department !== undefined ? { department } : {}),
        ...(contactNumber !== undefined ? { contactNumber } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        contactNumber: true,
        createdAt: true,
        updatedAt: true,
        Active: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function deactivateAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return next(createHttpError('User not found', 404));
    }

    // Deactivate user account (soft delete)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { Active: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        contactNumber: true,
        Active: true,
      },
    });

    // Revoke all sessions and refresh tokens
    await prisma.session.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    res.json({
      message: 'Account deactivated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;

    const bookings = await prisma.booking.findMany({
      where: { 
        employeeId: userId,
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        rooms: {
          include: { room: true },
        },
        amenities: {
          include: { amenity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
}