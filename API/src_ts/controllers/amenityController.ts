import { NextFunction, Request, Response } from 'express';
import * as amenityService from '../services/amenityService';

export async function listAmenities(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await amenityService.listAmenities());
  } catch (error) {
    next(error);
  }
}

export async function createAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await amenityService.createAmenity(req.body));
  } catch (error) {
    next(error);
  }
}

export async function updateAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await amenityService.updateAmenity(Number(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

export async function archiveAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await amenityService.archiveAmenity(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}
