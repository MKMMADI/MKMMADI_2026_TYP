/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements amenity service domain operations and their persistence or integrations.
 */

import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';

/**
 * Returns active amenities ordered from newest to oldest.

 * @returns A promise resolving to active amenity records ordered by creation time.
 */
export function listAmenities() {
  return prisma.amenity.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
}

/**
 * Creates an amenity from its name and optional description; an omitted active flag defaults to true.
 * @param input Amenity name and optional description and active flag.
 * @returns A promise resolving to the newly created amenity record.
 */
export async function createAmenity(input: { name?: string; description?: string; isActive?: boolean }) {
  const { name, description, isActive = true } = input;
  if (!name) throw createHttpError('Name is required', 400);
  return prisma.amenity.create({ data: { name, description, isActive } });
}

/**
 * Updates the supplied amenity fields while leaving unspecified fields unchanged.
 * @param id Positive integer ID of the amenity to update.
 * @param input Optional name, description, and active flag; omitted fields remain unchanged.
 * @returns A promise resolving to the updated amenity record.
 */
export async function updateAmenity(
  id: number,
  input: { name?: string; description?: string; isActive?: boolean },
) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid amenity id', 400);
  if (!(await prisma.amenity.findUnique({ where: { id } }))) {
    throw createHttpError('Amenity not found', 404);
  }
  const { name, description, isActive } = input;
  return prisma.amenity.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
}

/**
 * Marks an amenity inactive without deleting it.
 * @param id Positive integer ID of the amenity to mark inactive.
 * @returns A promise resolving to the amenity record after it is marked inactive.
 */
export async function archiveAmenity(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid amenity id', 400);
  if (!(await prisma.amenity.findUnique({ where: { id } }))) {
    throw createHttpError('Amenity not found', 404);
  }
  return prisma.amenity.update({ where: { id }, data: { isActive: false } });
}
