import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';

const adjustmentInclude = { adjustedBy: { select: { id: true, name: true, email: true } } } as const;

export function listConsumables() {
  return prisma.consumableItem.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getConsumable(id: number) {
  const item = await prisma.consumableItem.findUnique({
    where: { id },
    include: { adjustments: { include: adjustmentInclude, orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!item) throw createHttpError('Consumable item not found', 404);
  return item;
}

export async function createConsumable(input: {
  name?: string; unit?: string; quantityOnHand?: unknown; reorderLevel?: unknown;
}, userId: number) {
  const { name, unit, quantityOnHand, reorderLevel } = input;
  if (!name || !unit) throw createHttpError('Name and unit are required', 400);
  const existing = await prisma.consumableItem.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) throw createHttpError('A consumable item with this name already exists', 400);
  const item = await prisma.consumableItem.create({
    data: {
      name, unit,
      quantityOnHand: Number(quantityOnHand) || 0,
      reorderLevel: Number(reorderLevel) || 5,
    },
  });
  if (item.quantityOnHand > 0) {
    await prisma.stockAdjustment.create({
      data: { itemId: item.id, adjustedById: userId, quantityChange: item.quantityOnHand, reason: 'Initial stock setup' },
    });
  }
  return item;
}

export async function updateConsumable(id: number, input: {
  name?: string; unit?: string; quantityOnHand?: unknown; reorderLevel?: unknown;
}) {
  if (!(await prisma.consumableItem.findUnique({ where: { id } }))) {
    throw createHttpError('Consumable item not found', 404);
  }
  const { name, unit, quantityOnHand, reorderLevel } = input;
  return prisma.consumableItem.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(unit !== undefined ? { unit } : {}),
      ...(quantityOnHand !== undefined ? { quantityOnHand: Number(quantityOnHand) } : {}),
      ...(reorderLevel !== undefined ? { reorderLevel: Number(reorderLevel) } : {}),
    },
  });
}

export async function deleteConsumable(id: number) {
  if (!(await prisma.consumableItem.findUnique({ where: { id }, include: { adjustments: true } }))) {
    throw createHttpError('Consumable item not found', 404);
  }
  await prisma.consumableItem.delete({ where: { id } });
  return { message: 'Consumable item deleted successfully' };
}

export async function adjustStock(id: number, userId: number, quantityChange: unknown, reason: string) {
  if (quantityChange === undefined || quantityChange === null) throw createHttpError('Quantity change is required', 400);
  if (!reason) throw createHttpError('Reason for adjustment is required', 400);
  const item = await prisma.consumableItem.findUnique({ where: { id } });
  if (!item) throw createHttpError('Consumable item not found', 404);
  const amount = Number(quantityChange);
  const newQuantity = item.quantityOnHand + amount;
  if (newQuantity < 0) throw createHttpError('Insufficient stock. Cannot reduce below zero.', 400);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.consumableItem.update({ where: { id }, data: { quantityOnHand: newQuantity } });
    const adjustment = await tx.stockAdjustment.create({
      data: { itemId: id, adjustedById: userId, quantityChange: amount, reason },
      include: adjustmentInclude,
    });
    return { item: updated, adjustment };
  });
}

export async function getStockAdjustments(id: number, limit: number) {
  if (!(await prisma.consumableItem.findUnique({ where: { id } }))) {
    throw createHttpError('Consumable item not found', 404);
  }
  return prisma.stockAdjustment.findMany({
    where: { itemId: id }, include: adjustmentInclude, orderBy: { createdAt: 'desc' }, take: limit,
  });
}

export function getLowStockItems() {
  return prisma.consumableItem.findMany({
    where: { quantityOnHand: { lte: prisma.consumableItem.fields.reorderLevel } },
    orderBy: { quantityOnHand: 'asc' },
  });
}
