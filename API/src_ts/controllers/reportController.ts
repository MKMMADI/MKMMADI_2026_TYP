/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements HTTP request handlers for report operations.
 */

import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as reportService from '../services/reportService';

/**
 * Returns availability report data for the optional startDate and endDate query values.
 * @param req Authenticated request whose startDate, endDate, and optional limit query values are read.
 * @param res Express response used to send the report result.
 * @param next Express callback used to forward report errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getAvailabilityReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;
    res.json(await reportService.getAvailabilityReport(
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined,
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Returns usage report data for the optional startDate and endDate query values.
 * @param req Authenticated request whose startDate, endDate, and optional limit query values are read.
 * @param res Express response used to send the report result.
 * @param next Express callback used to forward report errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getUsageReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;
    res.json(await reportService.getUsageReport(
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined,
    ));
  } catch (error) {
    next(error);
  }
}

/**
 * Returns popularity report data for the optional date range and limit query.
 * @param req Authenticated request whose startDate, endDate, and optional limit query values are read.
 * @param res Express response used to send the report result.
 * @param next Express callback used to forward report errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getPopularityReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, limit } = req.query;
    res.json(await reportService.getPopularityReport(
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined,
      limit === undefined ? undefined : Number(limit),
    ));
  } catch (error) {
    next(error);
  }
}
