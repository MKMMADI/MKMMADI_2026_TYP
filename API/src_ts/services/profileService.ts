/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements profile service domain operations and their persistence or integrations.
 */

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

/**
 * Returns the selected profile fields for the user or throws when the user does not exist.
 * @param userId ID of the user whose profile is retrieved.
 * @returns A promise resolving to the selected user profile fields.
 */
export async function getProfile(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
  if (!user) throw createHttpError('User not found', 404);
  return user;
}

/**
 * Updates the supplied profile fields and returns the selected profile fields.
 * @param userId ID of the user whose profile is updated.
 * @param input Optional profile name, department, and contact number updates.
 * @returns A promise resolving to the updated selected profile fields.
 */
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

/**
 * Deactivates the account and revokes all of the user’s access and refresh-token sessions.
 * @param userId ID of the account to deactivate.
 * @returns A promise resolving to a confirmation message and the deactivated user fields.
 */
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

/**
 * Returns the user’s non-cancelled bookings, including rooms and amenities, newest first.
 * @param userId ID of the employee whose bookings are retrieved.
 * @returns A promise resolving to the user’s non-cancelled bookings with room and amenity details.
 */
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
