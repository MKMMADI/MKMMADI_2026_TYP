/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Provides shared auth utility functions for the API.
 */

import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma';
import config from '../config';

const JWT_SECRET = config.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES = config.ACCESS_TOKEN_EXPIRES;
const REFRESH_TOKEN_EXPIRES_DAYS = config.REFRESH_TOKEN_EXPIRES_DAYS;

/**
 * Hashes a plaintext password with bcrypt using ten salt rounds.
 * @param password Plaintext password to hash.
 * @returns A bcrypt hash of the password.
 */
export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}


/**
 * Checks a plaintext password against its bcrypt hash.
 * @param password Plaintext password to compare with the stored hash.
 * @param hash Stored bcrypt password hash to compare with the plaintext password.
 * @returns True when the password matches the hash; otherwise false.
 */
export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}


/**
 * Generates a random identifier for a JWT session.

 * @returns A unique random JWT session identifier.
 */
export function generateJti() {
  if ((crypto as any).randomUUID) return (crypto as any).randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Signs the supplied JWT claims with the configured secret and a session ID, returning both token and ID.
 * @param payload Claims to include in the signed JWT access token.
 * @param jwtId Optional JWT session identifier; a new one is generated when omitted.
 * @returns The signed JWT and its session identifier.
 */
export function signAccessToken(payload: Record<string, any>, jwtId?: string) {
  const jti = jwtId || generateJti();
  const options: SignOptions = { expiresIn: (ACCESS_TOKEN_EXPIRES as unknown) as SignOptions['expiresIn'], jwtid: jti };
  const token = jwt.sign(payload as any, JWT_SECRET as any, options);
  return { token, jti };
}

/**
 * Verifies the access token with the configured secret and returns its decoded claims.
 * @param token JWT access token whose signature and expiry are verified.
 * @returns The decoded JWT claims after signature and expiry validation.
 */
export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}

/**
 * Generates a cryptographically random refresh token and its SHA-256 storage hash.

 * @returns The raw refresh token and its SHA-256 hash.
 */
export function generateRefreshToken() {
  // generate a random token and also return a SHA256 hash to store
  const token = crypto.randomBytes(48).toString('hex');
  const token_hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, token_hash };
}


/**
 * Creates an access-token session record for the specified user and expiry.
 * @param userId ID of the user who owns the session or refresh token.
 * @param jwtId JWT session identifier to associate with the stored session.
 * @param expiresAt Time when the session or refresh token expires.
 * @returns A promise resolving to the created session record.
 */
export async function storeSession(userId: number, jwtId: string, expiresAt: Date) {
  return prisma.session.create({
    data: {
      userId,
      jwtId,
      expiresAt,
    },
  });
}

/**
 * Stores the refresh-token hash, user ID, and expiration in the database.
 * @param userId ID of the user who owns the session or refresh token.
 * @param token_hash SHA-256 hash of the refresh token to persist.
 * @param expiresAt Time when the session or refresh token expires.
 * @returns A promise resolving to the created refresh-token record.
 */
export async function storeRefreshToken(userId: number, token_hash: string, expiresAt: Date) {
  return prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: token_hash,
      expiresAt,
    },
  });
}


/**
 * Returns the date when a refresh token expires based on the configured lifetime.

 * @returns The calculated refresh-token expiry Date.
 */
export function refreshTokenExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return d;
}


/**
 * Returns the access-token expiry fifteen minutes from the current time.

 * @returns The calculated access-token expiry Date.
 */
export function accessTokenExpiryDateFromPayload(): Date {
  // jwt signs using expiresIn string; to compute expiry time, use current + configured expiry
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
}
