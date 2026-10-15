/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements auth service domain operations and their persistence or integrations.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { Prisma, Role } from '@prisma/client';
import config from '../config';
import {
  hashPassword, verifyPassword, signAccessToken, generateRefreshToken,
  refreshTokenExpiryDate,
} from '../utils/auth';
import { createHttpError } from '../utils/httpError';

/**
 * Persists an access-token session for the user in the supplied Prisma client or transaction.
 * @param tx Prisma client or transaction in which to persist the token record.
 * @param userId ID of the account that owns the session or refresh token.
 * @param jwtId JWT session identifier associated with this user’s access token.
 * @param expiresAt Expiry timestamp for the session or refresh token.
 * @returns A promise resolving to the created session record.
 */
async function storeSession(tx: Prisma.TransactionClient | typeof prisma, userId: number, jwtId: string, expiresAt: Date) {
  return tx.session.create({
    data: { userId, jwtId, expiresAt },
  });
}

/**
 * Persists the refresh-token hash and expiry for the user.
 * @param tx Prisma client or transaction in which to persist the token record.
 * @param userId ID of the account that owns the session or refresh token.
 * @param tokenHash SHA-256 digest of the refresh token; the raw token is not stored.
 * @param expiresAt Expiry timestamp for the session or refresh token.
 * @returns A promise resolving to the created refresh-token record.
 */
async function storeRefreshToken(tx: Prisma.TransactionClient | typeof prisma, userId: number, tokenHash: string, expiresAt: Date) {
  return tx.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

/**
 * Returns the access-token session expiry fifteen minutes after the current time.

 * @returns The access-token expiry Date, fifteen minutes after the current time.
 */
function accessExpiryFromNow() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);
  return expiry;
}

/**
 * Converts a role to a supported Role value, defaulting to EMPLOYEE for missing or unsupported input.
 * @param role Requested role string to normalize to a supported account role.
 * @returns A supported Role value.
 */
function normalizeRole(role: string | undefined): Role {
  const normalized = (role || 'EMPLOYEE').toUpperCase();
  return ['CLERK', 'MANAGER', 'EMPLOYEE'].includes(normalized) ? normalized as Role : 'EMPLOYEE';
}

/**
 * Signs an access token and creates corresponding access-session and refresh-token records.
 * @param user User ID, email, and role for which authentication tokens are issued.
 * @param tx Prisma client or transaction in which to persist the token record.
 * @returns A promise resolving to a newly signed access token and refresh token.
 */
async function issueTokens(user: { id: number; email: string; role: string }, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const { token: accessToken, jti } = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  await storeSession(tx, user.id, jti, accessExpiryFromNow());
  const { token: refreshToken, token_hash } = generateRefreshToken();
  await storeRefreshToken(tx, user.id, token_hash, refreshTokenExpiryDate());
  return { accessToken, refreshToken };
}

/**
 * Creates the first manager account and rejects the request if a manager already exists.
 * @param input Manager name, email, password, and optional department and contact number.
 * @returns A promise resolving to the new manager’s access and refresh tokens.
 */
export async function signupManager(input: {
  name?: string; email?: string; password?: string; department?: string; contactNumber?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existingManager = await tx.user.findFirst({ where: { role: 'MANAGER' } });
    if (existingManager) {
      throw createHttpError('A manager account already exists', 403);
    }
    return signupInternal({ ...input, role: 'MANAGER' }, tx);
  });
}

/**
 * Validates required account fields, creates the user with a hashed password, and issues tokens.
 * @param input Name, email, password, role, department, and contact number to register.
 * @param tx Prisma client or transaction in which to persist the token record.
 * @returns A promise resolving to the new user’s access and refresh tokens.
 */
async function signupInternal(input: {
  name?: string; email?: string; password?: string; role?: string; department?: string; contactNumber?: string;
}, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const { name, email, password, role, department, contactNumber } = input;
  if (!email || !password || !name) throw createHttpError('Missing fields', 400);
  const existingUser = await tx.user.findUnique({ where: { email } });
  if (existingUser) throw createHttpError('Email already in use', 400);
  const user = await tx.user.create({
    data: { name, email, passwordHash: hashPassword(password), role: normalizeRole(role), department, contactNumber },
  });
  return issueTokens(user, tx);
}

/**
 * Creates an account in a transaction and returns its access and refresh tokens.
 * @param input Name, email, password, and optional role, department, and contact number.
 * @returns A promise resolving to the new user’s access and refresh tokens.
 */
export async function signup(input: {
  name?: string; email?: string; password?: string; role?: string; department?: string; contactNumber?: string;
}) {
  return prisma.$transaction(async (tx) => signupInternal(input, tx));
}

/**
 * Validates the credentials in a transaction and returns newly issued access and refresh tokens.
 * @param email Email address used to locate the account.
 * @param password Plaintext password to verify against the stored password hash.
 * @returns A promise resolving to a success message and newly issued access and refresh tokens.
 */
export async function login(email?: string, password?: string) {
  if (!email || !password) throw createHttpError('Missing fields', 400);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw createHttpError('Invalid credentials', 400);
    }
    const tokens = await issueTokens(user, tx);
    return { message: 'Login successful', ...tokens };
  });
}

/**
 * Validates and revokes the supplied refresh token, then issues a replacement token pair.
 * @param refreshToken Raw refresh token to validate and rotate.
 * @returns A promise resolving to a replacement access token and refresh token.
 */
export async function refresh(refreshToken?: string) {
  if (!refreshToken) throw createHttpError('Missing refreshToken', 400);
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  return prisma.$transaction(async (tx) => {
    const stored = await tx.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revoked) throw createHttpError('Invalid refresh token', 401);
    if (stored.expiresAt <= new Date()) throw createHttpError('Refresh token expired', 401);

    await tx.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const user = await tx.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw createHttpError('User not found', 400);
    return issueTokens(user, tx);
  });
}

/**
 * Verifies and revokes the access-token session and optional refresh token, returning the session owner ID.
 * @param accessToken JWT access token whose session is being revoked.
 * @param refreshToken Raw refresh token to validate and rotate.
 * @returns A promise resolving to the ID of the user whose session was revoked.
 */
export async function logout(accessToken: string, refreshToken?: string) {
  const decoded = jwt.verify(accessToken, config.JWT_SECRET) as { jti?: string; jwtid?: string };
  const jti = decoded.jti || decoded.jwtid;
  if (!jti) throw createHttpError('Token missing jti', 400);

  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { jwtId: jti }, select: { userId: true } });
    if (!session) throw createHttpError('Session not found', 401);
    await tx.session.updateMany({ where: { jwtId: jti }, data: { revoked: true } });

    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash } });
      if (!stored) throw createHttpError('Refresh Token Cannot Be Validated', 400);
      await tx.refreshToken.update({ where: { tokenHash }, data: { revoked: true } });
    }

    return session.userId;
  });
}
