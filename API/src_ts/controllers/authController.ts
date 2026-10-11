import { NextFunction, Request, Response } from 'express';
import * as authService from '../services/authService';
import { createHttpError } from '../utils/httpError';
import { disconnectUserSockets } from '../services/realtime';

export async function signupManager(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await authService.signupManager(req.body));
  } catch (error) { next(error); }
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await authService.signup(req.body));
  } catch (error) { next(error); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body ?? {};
    res.json(await authService.login(email, password));
  } catch (error) { next(error); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await authService.refresh(req.body?.refreshToken));
  } catch (error) { next(error); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next(createHttpError('Missing Authorization header', 400));
    const parts = authHeader.split(' ');
    if (parts.length !== 2) return next(createHttpError('Invalid Authorization header', 400));
    const userId = await authService.logout(parts[1], req.body?.refreshToken);
    disconnectUserSockets(userId);
    res.json({ message: 'Logged out' });
  } catch (error) { next(error); }
}
