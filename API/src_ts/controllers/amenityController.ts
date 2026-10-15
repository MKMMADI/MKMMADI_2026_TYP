/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements HTTP request handlers for amenity operations.
 */

import { NextFunction, Request, Response } from 'express';
import * as amenityService from '../services/amenityService';

/**
 * Returns the active amenity list.
 * @param _req Express request parameter; unused because the handler does not need request data.
 * @param res Express response used to send the amenity operation result.
 * @param next Express callback used to forward amenity-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function listAmenities(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await amenityService.listAmenities());
  } catch (error) {
    next(error);
  }
}

/**
 * Creates an amenity from the request body and responds with the created record.
 * @param req Request containing the amenity route ID or fields to create or update.
 * @param res Express response used to send the amenity operation result.
 * @param next Express callback used to forward amenity-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function createAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await amenityService.createAmenity(req.body));
  } catch (error) {
    next(error);
  }
}

/**
 * Updates the amenity identified by the route parameter using supplied request fields.
 * @param req Request containing the amenity route ID or fields to create or update.
 * @param res Express response used to send the amenity operation result.
 * @param next Express callback used to forward amenity-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function updateAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await amenityService.updateAmenity(Number(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

/**
 * Archives the amenity identified by the route parameter.
 * @param req Request containing the amenity route ID or fields to create or update.
 * @param res Express response used to send the amenity operation result.
 * @param next Express callback used to forward amenity-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function archiveAmenity(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await amenityService.archiveAmenity(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}
