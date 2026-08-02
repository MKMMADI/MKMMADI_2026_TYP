import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma';
import config from '../config';

const JWT_SECRET = config.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES = config.ACCESS_TOKEN_EXPIRES;
const REFRESH_TOKEN_EXPIRES_DAYS = config.REFRESH_TOKEN_EXPIRES_DAYS;

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function generateJti() {
  if ((crypto as any).randomUUID) return (crypto as any).randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

export function signAccessToken(payload: Record<string, any>, jwtId?: string) {
  const jti = jwtId || generateJti();
  const options: SignOptions = { expiresIn: (ACCESS_TOKEN_EXPIRES as unknown) as SignOptions['expiresIn'], jwtid: jti };
  const token = jwt.sign(payload as any, JWT_SECRET as any, options);
  return { token, jti };
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}

export function generateRefreshToken() {
  // generate a random token and also return a SHA256 hash to store
  const token = crypto.randomBytes(48).toString('hex');
  const token_hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, token_hash };
}

export async function storeSession(userId: number, jwtId: string, expiresAt: Date) {
  return prisma.session.create({
    data: {
      user_id: userId,
      jwt_id: jwtId,
      expires_at: expiresAt,
    },
  });
}

export async function storeRefreshToken(userId: number, token_hash: string, expiresAt: Date) {
  return prisma.refreshToken.create({
    data: {
      user_id: userId,
      token_hash,
      expires_at: expiresAt,
    },
  });
}

export function refreshTokenExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return d;
}

export function accessTokenExpiryDateFromPayload(): Date {
  // jwt signs using expiresIn string; to compute expiry time, use current + configured expiry
  // For simplicity assume 15 minutes if using default
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
}
