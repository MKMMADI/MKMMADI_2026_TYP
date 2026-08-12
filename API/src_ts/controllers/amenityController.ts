import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';

export async function listAmenities(req: Request, res: Response, next: NextFunction) {
  try {
    const amenities = await prisma.amenity.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    res.json(amenities);
  } catch (error) {
    next(error);
  }
}

export async function createAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, isActive = true } = req.body;
    if (!name) {
      return next(createHttpError('Name is required', 400));
    }
    const amenity = await prisma.amenity.create({ data: { name, description, isActive } });
    res.status(201).json(amenity);
  } catch (error) {
    next(error);
  }
}

export async function updateAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { name, description, isActive } = req.body;
    const amenity = await prisma.amenity.update({
      where: { id },
      //does the below follow business rules?
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });
    res.json(amenity);
  } catch (error) {
    next(error);
  }
}

export async function archiveAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const amenity = await prisma.amenity.update({ where: { id }, data: { isActive: false } });
    res.json(amenity);
  } catch (error) {
    next(error);
  }
}
