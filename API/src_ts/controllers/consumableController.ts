import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as consumableService from '../services/consumableService';

export async function listConsumables(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.listConsumables());
  } catch (error) {
    next(error);
  }
}

export async function getConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.getConsumable(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function createConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await consumableService.createConsumable(req.body, req.user.id));
  } catch (error) {
    next(error);
  }
}

export async function updateConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.updateConsumable(Number(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

export async function deleteConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.deleteConsumable(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { quantityChange, reason } = req.body;
    res.json(await consumableService.adjustStock(Number(req.params.id), req.user.id, quantityChange, reason));
  } catch (error) {
    next(error);
  }
}

export async function getStockAdjustments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rawLimit = req.query?.limit !== undefined ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50;
    res.json(await consumableService.getStockAdjustments(Number(req.params.id), limit));
  } catch (error) {
    next(error);
  }
}

export async function getLowStockItems(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.getLowStockItems());
  } catch (error) {
    next(error);
  }
}
