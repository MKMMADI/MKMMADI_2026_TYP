/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements HTTP request handlers for consumable operations.
 */

import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as consumableService from '../services/consumableService';

/**
 * Returns the consumable list.
 * @param _req Express request parameter; unused because the handler does not need request data.
 * @param res Express response used to send the consumable operation result.
 * @param next Express callback used to forward consumable-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function listConsumables(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.listConsumables());
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the consumable identified by the route parameter.
 * @param req Authenticated request containing the item route ID or stock operation fields.
 * @param res Express response used to send the consumable operation result.
 * @param next Express callback used to forward consumable-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.getConsumable(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a consumable and records the authenticated user as the initial stock actor.
 * @param req Authenticated request containing the item route ID or stock operation fields.
 * @param res Express response used to send the consumable operation result.
 * @param next Express callback used to forward consumable-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function createConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await consumableService.createConsumable(req.body, req.user.id));
  } catch (error) {
    next(error);
  }
}

/**
 * Updates the supplied fields for the consumable identified by the route parameter.
 * @param req Authenticated request containing the item route ID or stock operation fields.
 * @param res Express response used to send the consumable operation result.
 * @param next Express callback used to forward consumable-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function updateConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.updateConsumable(Number(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes the consumable identified by the route parameter.
 * @param req Authenticated request containing the item route ID or stock operation fields.
 * @param res Express response used to send the consumable operation result.
 * @param next Express callback used to forward consumable-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function deleteConsumable(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.deleteConsumable(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

/**
 * Applies the requested stock quantity change and reason for the specified item.
 * @param req Authenticated request containing the item route ID or stock operation fields.
 * @param res Express response used to send the consumable operation result.
 * @param next Express callback used to forward consumable-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function adjustStock(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { quantityChange, reason } = req.body;
    res.json(await consumableService.adjustStock(Number(req.params.id), req.user.id, quantityChange, reason));
  } catch (error) {
    next(error);
  }
}

/**
 * Returns up to the requested number of stock adjustments for the item.
 * @param req Authenticated request containing the item route ID or stock operation fields.
 * @param res Express response used to send the consumable operation result.
 * @param next Express callback used to forward consumable-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getStockAdjustments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rawLimit = req.query?.limit !== undefined ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50;
    res.json(await consumableService.getStockAdjustments(Number(req.params.id), limit));
  } catch (error) {
    next(error);
  }
}

/**
 * Returns consumable items at or below their reorder levels.
 * @param _req Express request parameter; unused because the handler does not need request data.
 * @param res Express response used to send the consumable operation result.
 * @param next Express callback used to forward consumable-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getLowStockItems(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await consumableService.getLowStockItems());
  } catch (error) {
    next(error);
  }
}
