import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as reportService from '../services/reportService';

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
