import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import config from '../config';

const JWT_SECRET = config.JWT_SECRET;

export interface AuthRequest extends Request {
  user?: any;
  tokenJti?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Missing Authorization header' });

    const parts = (authHeader as string).split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Invalid Authorization header' });

    const token = parts[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const jti = decoded.jti || decoded?.jwtid || null;
    if (!jti) return res.status(401).json({ message: 'Token missing jti' });

    const session = await prisma.session.findUnique({ where: { jwtId: jti } });
    if (!session || session.revoked) return res.status(401).json({ message: 'Session revoked or not found' });
    if (session.expiresAt <= new Date()) return res.status(401).json({ message: 'Session expired' });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = { id: user.id, email: user.email, role: user.role };
    req.tokenJti = jti;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ message: 'Insufficient role' });
    next();
  };
}

export function requireRoles(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Insufficient role' });
    next();
  };
}
