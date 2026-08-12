import { NextFunction, Response } from 'express';
import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/auth';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(createHttpError('User not found', 404));
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      contactNumber: user.contactNumber,
    });
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
    });
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      contactNumber: user.contactNumber,
    });
  } catch (error) {
    next(error);
  }
}
