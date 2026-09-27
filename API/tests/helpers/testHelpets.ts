import request from 'supertest';
import { Express } from 'express';
import prisma from '../../src_ts/prismaTest';
import { hashPassword } from '../../src_ts/utils/auth';
import crypto from 'crypto';

export interface TestUser {
  id: number;
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
 * Create a test user in the database
 */
export async function createUser(userData: Partial<TestUser>): Promise<TestUser> {
  const user: Omit<TestUser, 'id'> & { id?: number } = {
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
  } as TestUser;
}

/**
 * Login and get auth tokens for a user
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
 * Create a user and login to get tokens
 */
export async function createAndLoginUser(userData: Partial<TestUser> = {}): Promise<{ user: TestUser; tokens: AuthTokens }> {
  const user = await createUser(userData);
  const tokens = await login(user.email, user.password);
  return { user, tokens };
}

/**
 * Generate a valid authorization header
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in reverse order of dependencies
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
 * Wait for a specified time (useful for token expiry tests)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random string
 */
export function randomString(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
