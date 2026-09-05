import { NextFunction,Request, Response } from 'express';
import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/auth';

export async function listConsumables(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const consumables = await prisma.consumableItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(consumables);
  } catch (error) {
    next(error);
  }
}

export async function getConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const consumable = await prisma.consumableItem.findUnique({
      where: { id },
      include: {
        adjustments: {
          include: {
            adjustedBy: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!consumable) {
      return next(createHttpError('Consumable item not found', 404));
    }

    res.json(consumable);
  } catch (error) {
    next(error);
  }
}

export async function createConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, unit, quantityOnHand, reorderLevel } = req.body;

    if (!name || !unit) {
      return next(createHttpError('Name and unit are required', 400));
    }

    // Check if consumable with same name exists
    const existing = await prisma.consumableItem.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existing) {
      return next(createHttpError('A consumable item with this name already exists', 400));
    }

    const consumable = await prisma.consumableItem.create({
      data: {
        name,
        unit,
        quantityOnHand: Number(quantityOnHand) || 0,
        reorderLevel: Number(reorderLevel) || 5,
      },
    });

    // Create initial stock adjustment record
    if (consumable.quantityOnHand > 0) {
      await prisma.stockAdjustment.create({
        data: {
          itemId: consumable.id,
          adjustedById: req.user.id,
          quantityChange: consumable.quantityOnHand,
          reason: 'Initial stock setup',
        },
      });
    }

    res.status(201).json(consumable);
  } catch (error) {
    next(error);
  }
}

export async function updateConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { name, unit, quantityOnHand, reorderLevel } = req.body;

    const existing = await prisma.consumableItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(createHttpError('Consumable item not found', 404));
    }

    const consumable = await prisma.consumableItem.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(quantityOnHand !== undefined ? { quantityOnHand: Number(quantityOnHand) } : {}),
        ...(reorderLevel !== undefined ? { reorderLevel: Number(reorderLevel) } : {}),
      },
    });

    res.json(consumable);
  } catch (error) {
    next(error);
  }
}

export async function deleteConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.consumableItem.findUnique({
      where: { id },
      include: { adjustments: true },
    });

    if (!existing) {
      return next(createHttpError('Consumable item not found', 404));
    }

    // Check if there are any stock adjustments (soft delete / archive)
    // We'll soft delete by removing from active list instead of hard delete
    // Since we want to preserve history, we could add an isActive field
    // For now, we'll delete but cascade will handle related records
    await prisma.consumableItem.delete({
      where: { id },
    });

    res.json({ message: 'Consumable item deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { quantityChange, reason } = req.body;

    if (quantityChange === undefined || quantityChange === null) {
      return next(createHttpError('Quantity change is required', 400));
    }

    if (!reason) {
      return next(createHttpError('Reason for adjustment is required', 400));
    }

    const consumable = await prisma.consumableItem.findUnique({
      where: { id },
    });

    if (!consumable) {
      return next(createHttpError('Consumable item not found', 404));
    }

    const newQuantity = consumable.quantityOnHand + Number(quantityChange);

    if (newQuantity < 0) {
      return next(createHttpError('Insufficient stock. Cannot reduce below zero.', 400));
    }

    // Update quantity and create adjustment record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.consumableItem.update({
        where: { id },
        data: {
          quantityOnHand: newQuantity,
        },
      });

      const adjustment = await tx.stockAdjustment.create({
        data: {
          itemId: id,
          adjustedById: req.user.id,
          quantityChange: Number(quantityChange),
          reason,
        },
        include: {
          adjustedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return { updated, adjustment };
    });

    res.json({
      item: result.updated,
      adjustment: result.adjustment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getStockAdjustments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const existing = await prisma.consumableItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(createHttpError('Consumable item not found', 404));
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where: { itemId: id },
      include: {
        adjustedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(adjustments);
  } catch (error) {
    next(error);
  }
}

export async function getLowStockItems(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const items = await prisma.consumableItem.findMany({
      where: {
        quantityOnHand: {
          lte: prisma.consumableItem.fields.reorderLevel,
        },
      },
      orderBy: {
        quantityOnHand: 'asc',
      },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
}