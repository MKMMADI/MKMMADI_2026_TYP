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

async function storeSession(tx: Prisma.TransactionClient | typeof prisma, userId: number, jwtId: string, expiresAt: Date) {
  return tx.session.create({
    data: { userId, jwtId, expiresAt },
  });
}

async function storeRefreshToken(tx: Prisma.TransactionClient | typeof prisma, userId: number, tokenHash: string, expiresAt: Date) {
  return tx.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

function accessExpiryFromNow() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);
  return expiry;
}

function normalizeRole(role: string | undefined): Role {
  const normalized = (role || 'EMPLOYEE').toUpperCase();
  return ['CLERK', 'MANAGER', 'EMPLOYEE'].includes(normalized) ? normalized as Role : 'EMPLOYEE';
}

async function issueTokens(user: { id: number; email: string; role: string }, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const { token: accessToken, jti } = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  await storeSession(tx, user.id, jti, accessExpiryFromNow());
  const { token: refreshToken, token_hash } = generateRefreshToken();
  await storeRefreshToken(tx, user.id, token_hash, refreshTokenExpiryDate());
  return { accessToken, refreshToken };
}

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

export async function signup(input: {
  name?: string; email?: string; password?: string; role?: string; department?: string; contactNumber?: string;
}) {
  return prisma.$transaction(async (tx) => signupInternal(input, tx));
}

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
