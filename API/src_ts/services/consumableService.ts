/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements consumable service domain operations and their persistence or integrations.
 */

import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';

const adjustmentInclude = { adjustedBy: { select: { id: true, name: true, email: true } } } as const;

/**
 * Returns consumable items ordered from newest to oldest.

 * @returns A promise resolving to consumable records ordered by creation time.
 */
export function listConsumables() {
  return prisma.consumableItem.findMany({ orderBy: { createdAt: 'desc' } });
}

/**
 * Returns a consumable with its ten most recent stock adjustments or throws when it does not exist.
 * @param id ID of the consumable item to retrieve.
 * @returns A promise resolving to the item and its ten most recent stock adjustments.
 */
export async function getConsumable(id: number) {
  const item = await prisma.consumableItem.findUnique({
    where: { id },
    include: { adjustments: { include: adjustmentInclude, orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!item) throw createHttpError('Consumable item not found', 404);
  return item;
}

/**
 * Creates a uniquely named consumable and records an initial stock adjustment when starting quantity is positive.
 * @param input Consumable name and unit, with optional starting quantity and reorder level.
 * @param userId ID of the account responsible for the initial stock record or adjustment.
 * @returns A promise resolving to the newly created consumable record.
 */
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

/**
 * Updates the supplied item fields without changing fields omitted from the request.
 * @param id ID of the consumable item to update.
 * @param input Optional name, unit, on-hand quantity, and reorder level; omitted fields remain unchanged.
 * @returns A promise resolving to the updated consumable record.
 */
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

/**
 * Deletes the specified consumable and returns a success message; throws when it does not exist.
 * @param id ID of the consumable item to delete.
 * @returns A promise resolving to a deletion confirmation message.
 */
export async function deleteConsumable(id: number) {
  if (!(await prisma.consumableItem.findUnique({ where: { id }, include: { adjustments: true } }))) {
    throw createHttpError('Consumable item not found', 404);
  }
  await prisma.consumableItem.delete({ where: { id } });
  return { message: 'Consumable item deleted successfully' };
}

/**
 * Applies a stock change, prevents the quantity becoming negative, and records the adjustment in a transaction.
 * @param id ID of the consumable item whose stock changes.
 * @param userId ID of the account responsible for the initial stock record or adjustment.
 * @param quantityChange Amount to add to or subtract from on-hand stock.
 * @param reason Required explanation stored with this stock adjustment.
 * @returns A promise resolving to the updated item and the created stock-adjustment record.
 */
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

/**
 * Returns the newest stock adjustments for an existing consumable up to the requested limit.
 * @param id ID of the consumable item whose adjustments are listed.
 * @param limit Maximum number of recent adjustments to return.
 * @returns A promise resolving to the item’s stock adjustments ordered newest first.
 */
export async function getStockAdjustments(id: number, limit: number) {
  if (!(await prisma.consumableItem.findUnique({ where: { id } }))) {
    throw createHttpError('Consumable item not found', 404);
  }
  return prisma.stockAdjustment.findMany({
    where: { itemId: id }, include: adjustmentInclude, orderBy: { createdAt: 'desc' }, take: limit,
  });
}

/**
 * Returns consumables at or below their reorder level, ordered by quantity.

 * @returns A promise resolving to consumable records at or below their reorder levels.
 */
export function getLowStockItems() {
  return prisma.consumableItem.findMany({
    where: { quantityOnHand: { lte: prisma.consumableItem.fields.reorderLevel } },
    orderBy: { quantityOnHand: 'asc' },
  });
}
