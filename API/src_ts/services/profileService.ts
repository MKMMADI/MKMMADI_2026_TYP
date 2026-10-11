import prisma from '../prisma';
import { createHttpError } from '../utils/httpError';

const profileSelect = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  role: true,
  officialRole: true,
  department: true,
  contactNumber: true,
  createdAt: true,
  updatedAt: true,
  Active: true,
} as const;

export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
  if (!user) throw createHttpError('User not found', 404);
  return user;
}

export function updateProfile(userId: number, input: {
  name?: string;
  department?: string;
  contactNumber?: string;
}) {
  const { name, department, contactNumber } = input;
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(contactNumber !== undefined ? { contactNumber } : {}),
    },
    select: profileSelect,
  });
}

export async function deactivateAccount(userId: number) {
  if (!(await prisma.user.findUnique({ where: { id: userId } }))) {
    throw createHttpError('User not found', 404);
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { Active: false },
    select: {
      id: true, employeeId: true, name: true, email: true, role: true,
      officialRole: true, department: true, contactNumber: true, Active: true,
    },
  });
  await prisma.session.updateMany({ where: { userId }, data: { revoked: true } });
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
  return { message: 'Account deactivated successfully', user };
}

export function getMyBookings(userId: number) {
  return prisma.booking.findMany({
    where: { employeeId: userId, status: { notIn: ['CANCELLED'] } },
    include: {
      rooms: { include: { room: true } },
      amenities: { include: { amenity: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
