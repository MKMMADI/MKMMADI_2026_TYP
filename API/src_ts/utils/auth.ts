import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma';
import config from '../config';

const JWT_SECRET = config.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES = config.ACCESS_TOKEN_EXPIRES;
const REFRESH_TOKEN_EXPIRES_DAYS = config.REFRESH_TOKEN_EXPIRES_DAYS;

//hashPassword takes a password and returns a hashed version of it using bcrypt.hashSync with a salt of 10.
export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}


//verifyPassword takes a password and a hash, and compares them using bcrypt.compareSync.
export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}


//creates a unique identifier for the JWT token. 
// If the crypto.randomUUID() function is available, it uses that to generate a UUID. 
// Otherwise, it falls back to generating a random 16-byte hex string using crypto.randomBytes().
export function generateJti() {
  if ((crypto as any).randomUUID) return (crypto as any).randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

//create a JWT access token with a payload and optional jwtId. 
// If no jwtId is provided, a new one is generated. 
// The token is signed using the JWT_SECRET and has an expiration time defined by ACCESS_TOKEN_EXPIRES(.env).
export function signAccessToken(payload: Record<string, any>, jwtId?: string) {
  const jti = jwtId || generateJti();
  const options: SignOptions = { expiresIn: (ACCESS_TOKEN_EXPIRES as unknown) as SignOptions['expiresIn'], jwtid: jti };
  const token = jwt.sign(payload as any, JWT_SECRET as any, options);
  return { token, jti };
}

//verifyAccessToken takes a token and verifies it using the JWT_SECRET.
export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as any;
}

//After a set time , token expires and a new token is generated using the refresh token.
//function serves to create a new refresh token and return it to the user, 
// while also storing a hash of the token in the database for later verification.
export function generateRefreshToken() {
  // generate a random token and also return a SHA256 hash to store
  const token = crypto.randomBytes(48).toString('hex');
  const token_hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, token_hash };
}


//upon login or refresh, a new session is created and stored in
// the database with the user id, jwt id, and expiration date
export async function storeSession(userId: number, jwtId: string, expiresAt: Date) {
  return prisma.session.create({
    data: {
      userId,
      jwtId,
      expiresAt,
    },
  });
}

//once a refresh token is generated, it is stored in the database with the user id and expiration date
export async function storeRefreshToken(userId: number, token_hash: string, expiresAt: Date) {
  return prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: token_hash,
      expiresAt,
    },
  });
}


//return expiration date ot refresh token
export function refreshTokenExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);
  return d;
}


//extracts jwt payload and returns the expiration date of the access token
export function accessTokenExpiryDateFromPayload(): Date {
  // jwt signs using expiresIn string; to compute expiry time, use current + configured expiry
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
}
