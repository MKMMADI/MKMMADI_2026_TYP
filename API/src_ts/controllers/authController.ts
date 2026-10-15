/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements HTTP request handlers for auth operations.
 */

import { NextFunction, Request, Response } from 'express';
import * as authService from '../services/authService';
import { createHttpError } from '../utils/httpError';
import { disconnectUserSockets } from '../services/realtime';

/**
 * Creates the initial manager account from the request body and sends the result.
 * @param req Request containing signup, login, refresh-token, or Authorization-header data.
 * @param res Express response used to send the authentication result.
 * @param next Express callback used to forward authentication errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function signupManager(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await authService.signupManager(req.body));
  } catch (error) { next(error); }
}

/**
 * Creates an account from the request body and sends the result.
 * @param req Request containing signup, login, refresh-token, or Authorization-header data.
 * @param res Express response used to send the authentication result.
 * @param next Express callback used to forward authentication errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await authService.signup(req.body));
  } catch (error) { next(error); }
}

/**
 * Authenticates the email and password in the request body and sends the token pair.
 * @param req Request containing signup, login, refresh-token, or Authorization-header data.
 * @param res Express response used to send the authentication result.
 * @param next Express callback used to forward authentication errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body ?? {};
    res.json(await authService.login(email, password));
  } catch (error) { next(error); }
}

/**
 * Exchanges the supplied refresh token for a new token pair.
 * @param req Request containing signup, login, refresh-token, or Authorization-header data.
 * @param res Express response used to send the authentication result.
 * @param next Express callback used to forward authentication errors.
 * @returns A promise resolving to a replacement access token and refresh token.
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await authService.refresh(req.body?.refreshToken));
  } catch (error) { next(error); }
}

/**
 * Revokes the bearer-token session and optional refresh token, disconnects the user’s sockets, and responds with confirmation.
 * @param req Request containing signup, login, refresh-token, or Authorization-header data.
 * @param res Express response used to send the authentication result.
 * @param next Express callback used to forward authentication errors.
 * @returns A promise resolving to the logged-out user ID after the session tokens are revoked.
 */
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
