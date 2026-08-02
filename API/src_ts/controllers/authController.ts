import { NextFunction, Request, Response } from 'express';
import prisma from '../prisma';
import config from '../config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  storeSession,
  storeRefreshToken,
  refreshTokenExpiryDate,
} from '../utils/auth';
import { createHttpError } from '../utils/httpError';

function accessExpiryFromNow() {
  // returns Date ~15 minutes from now
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, role = 'worker', employee_number, department, office_location } = req.body;
    if (!email || !password || !name) {
      return next(createHttpError('Missing fields', 400));
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return next(createHttpError('Email already in use', 400));
    }

    const password_hash = hashPassword(password);
    const user = await prisma.user.create({ data: { name, email, password_hash, role } });

    // create worker
    const worker = await prisma.worker.create({ data: { user_id: user.id, employee_number, department, office_location } });

    // if role is admin, create Admin record
    if (role === 'admin') {
      await prisma.admin.create({ data: { worker_id: worker.user_id } });
    }

    // issue tokens
    const payload = { sub: user.id, email: user.email, role: user.role };
    const { token: accessToken, jti } = signAccessToken(payload);
    const accessExpires = accessExpiryFromNow();

    // store session
    await storeSession(user.id, jti, accessExpires);

    // refresh token
    const { token: refreshToken, token_hash } = generateRefreshToken();
    const refreshExpires = refreshTokenExpiryDate();
    await storeRefreshToken(user.id, token_hash, refreshExpires);

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(createHttpError('Missing fields', 400));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(createHttpError('Invalid credentials', 400));
    }

    const ok = verifyPassword(password, user.password_hash);
    if (!ok) {
      return next(createHttpError('Invalid credentials', 400));
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const { token: accessToken, jti } = signAccessToken(payload);
    const accessExpires = accessExpiryFromNow();

    await storeSession(user.id, jti, accessExpires);

    const { token: refreshToken, token_hash } = generateRefreshToken();
    const refreshExpires = refreshTokenExpiryDate();
    await storeRefreshToken(user.id, token_hash, refreshExpires);

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(createHttpError('Missing refreshToken', 400));
    }

    const token_hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ where: { token_hash } });
    if (!stored || stored.revoked) {
      return next(createHttpError('Invalid refresh token', 401));
    }
    if (stored.expires_at <= new Date()) {
      return next(createHttpError('Refresh token expired', 401));
    }

    // revoke old refresh token
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    // issue new tokens
    const user = await prisma.user.findUnique({ where: { id: stored.user_id } });
    if (!user) {
      return next(createHttpError('User not found', 400));
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const { token: accessToken, jti } = signAccessToken(payload);
    const accessExpires = accessExpiryFromNow();
    await storeSession(user.id, jti, accessExpires);

    const { token: newRefreshToken, token_hash: new_token_hash } = generateRefreshToken();
    const refreshExpires = refreshTokenExpiryDate();
    await storeRefreshToken(user.id, new_token_hash, refreshExpires);

    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    // Expect either Authorization header or body.refreshToken to be supplied
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return next(createHttpError('Missing Authorization header', 400));
    }
    const parts = (authHeader as string).split(' ');
    if (parts.length !== 2) {
      return next(createHttpError('Invalid Authorization header', 400));
    }
    const token = parts[1];

    // decode to get jti
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const jti = decoded.jti || decoded?.jti || decoded?.jwtid || null;
    if (!jti) {
      return next(createHttpError('Token missing jti', 400));
    }

    // mark session revoked
    await prisma.session.updateMany({ where: { jwt_id: jti }, data: { revoked: true } });

    // optionally revoke refresh token provided in body
    const { refreshToken } = req.body;
    if (refreshToken) {
      const token_hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.updateMany({ where: { token_hash }, data: { revoked: true } });
    }

    return res.json({ message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
}
