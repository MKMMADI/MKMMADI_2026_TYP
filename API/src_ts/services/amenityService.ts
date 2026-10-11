import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';

export function listAmenities() {
  return prisma.amenity.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
}

export async function createAmenity(input: { name?: string; description?: string; isActive?: boolean }) {
  const { name, description, isActive = true } = input;
  if (!name) throw createHttpError('Name is required', 400);
  return prisma.amenity.create({ data: { name, description, isActive } });
}

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

export async function archiveAmenity(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid amenity id', 400);
  if (!(await prisma.amenity.findUnique({ where: { id } }))) {
    throw createHttpError('Amenity not found', 404);
  }
  return prisma.amenity.update({ where: { id }, data: { isActive: false } });
}
