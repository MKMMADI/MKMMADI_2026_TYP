/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Provides reusable API test fixtures and database, authentication, and timing helpers.
 */

import request from 'supertest';
import { Express } from 'express';
import prisma from '../../src_ts/prismaTest';
import { hashPassword } from '../../src_ts/utils/auth';
import crypto from 'crypto';

export interface TestUser {
  id: number;
  employeeId: string;
  email: string;
  password: string;
  name: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'CLERK';
  department?: string;
  contactNumber?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Creates a test user, filling omitted fields with defaults, and returns its database identifiers.
 * @param userData Optional test-user fields; omitted values are filled with test defaults.
 * @returns A promise resolving to the created test user and its database IDs.
 */
export async function createUser(userData: Partial<TestUser>): Promise<TestUser> {
  const user: Omit<TestUser, 'id' | 'employeeId'> & { id?: number } = {
    id: undefined,
    email: userData.email || `test_${Date.now()}@example.com`,
    password: userData.password || 'TestPassword123!',
    name: userData.name || 'Test User',
    role: userData.role || 'EMPLOYEE',
    department: userData.department || 'Engineering',
    contactNumber: userData.contactNumber || '+1234567890',
  };

  const passwordHash = hashPassword(user.password);
  
  const created = await prisma.user.create({
    data: {
      email: user.email,
      passwordHash,
      name: user.name,
      role: user.role,
      department: user.department,
      contactNumber: user.contactNumber,
    },
  });

  return {
    ...user,
    id: created.id,
    employeeId: created.employeeId,
  } as TestUser;
}

/**
 * Signs in to the test API with the supplied credentials and returns both issued tokens.
 * @param email Account email address.
 * @param password Plain-text account password supplied for authentication.
 * @returns A promise resolving to access and refresh tokens issued by the test API.
 */
export async function login(email: string, password: string): Promise<AuthTokens> {
  const app = (await import('../../src_ts/app')).default;
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  
  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.body.message}`);
  }
  
  return {
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
}

/**
 * Creates a test user, signs in, and returns the user together with its tokens.
 * @param userData Optional test-user fields; omitted values are filled with test defaults.
 * @returns A promise resolving to the created test user and its access and refresh tokens.
 */
export async function createAndLoginUser(userData: Partial<TestUser> = {}): Promise<{ user: TestUser; tokens: AuthTokens }> {
  const user = await createUser(userData);
  const tokens = await login(user.email, user.password);
  return { user, tokens };
}

/**
 * Formats an access token as an HTTP Authorization header.
 * @param token Access token to place in the Authorization header.
 * @returns An Authorization header object containing the bearer token.
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Deletes test database records in dependency-safe order.

 * @returns A promise resolving after dependent test records have been deleted.
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in reverse order of dependencies
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.bookingAmenity.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.consumableItem.deleteMany();
  await prisma.room.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Resolves after the requested delay.
 * @param ms Delay duration in milliseconds.
 * @returns A promise resolving after the requested delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a timestamped pseudo-random string with the supplied prefix.
 * @param prefix Prefix to include in the generated string.
 * @returns A timestamped pseudo-random string beginning with the supplied prefix.
 */
export function randomString(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
