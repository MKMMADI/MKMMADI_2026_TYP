/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements HTTP request handlers for profile operations.
 */

import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as profileService from '../services/profileService';

/**
 * Returns the authenticated user’s profile.
 * @param req Authenticated request identifying the user and carrying optional profile update fields.
 * @param res Express response used to send the profile operation result.
 * @param next Express callback used to forward profile-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await profileService.getProfile(req.user.id));
  } catch (error) {
    next(error);
  }
}

/**
 * Updates the authenticated user’s profile with the request body fields.
 * @param req Authenticated request identifying the user and carrying optional profile update fields.
 * @param res Express response used to send the profile operation result.
 * @param next Express callback used to forward profile-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await profileService.updateProfile(req.user.id, req.body));
  } catch (error) {
    next(error);
  }
}

/**
 * Deactivates the authenticated user’s account and revokes its sessions.
 * @param req Authenticated request identifying the user and carrying optional profile update fields.
 * @param res Express response used to send the profile operation result.
 * @param next Express callback used to forward profile-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function deactivateAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await profileService.deactivateAccount(req.user.id));
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the authenticated user’s booking history.
 * @param req Authenticated request identifying the user and carrying optional profile update fields.
 * @param res Express response used to send the profile operation result.
 * @param next Express callback used to forward profile-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getMyBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await profileService.getMyBookings(req.user.id));
  } catch (error) {
    next(error);
  }
}
