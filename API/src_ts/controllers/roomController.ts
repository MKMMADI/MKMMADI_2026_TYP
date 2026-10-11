import { NextFunction, Request, Response } from 'express';
import * as roomService from '../services/roomService';

export async function listRooms(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.listRooms());
  } catch (error) {
    next(error);
  }
}

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await roomService.createRoom(req.body));
  } catch (error) {
    next(error);
  }
}

export async function getRoom(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.getRoom(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function updateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.updateRoom(Number(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

export async function archiveRoom(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.archiveRoom(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function updateRoomStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.updateRoomStatus(Number(req.params.id), req.body?.status));
  } catch (error) {
    next(error);
  }
}

export async function searchAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.searchAvailability({
      startAt: req.query.startAt as string,
      endAt: req.query.endAt as string,
      capacity: req.query.capacity ? Number(req.query.capacity) : 0,
      amenityIds: typeof req.query.amenityIds === 'string' ? req.query.amenityIds.split(',') : [],
    }));
  } catch (error) {
    next(error);
  }
}
