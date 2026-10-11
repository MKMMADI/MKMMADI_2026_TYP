import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as profileService from '../services/profileService';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await profileService.getProfile(req.user.id));
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await profileService.updateProfile(req.user.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function deactivateAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await profileService.deactivateAccount(req.user.id));
  } catch (error) {
    next(error);
  }
}

export async function getMyBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await profileService.getMyBookings(req.user.id));
  } catch (error) {
    next(error);
  }
}
