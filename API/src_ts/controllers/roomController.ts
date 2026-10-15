/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements HTTP request handlers for room operations.
 */

import { NextFunction, Request, Response } from 'express';
import * as roomService from '../services/roomService';
import * as roomImageService from '../services/roomImageService';
import { createHttpError } from '../utils/httpError';

/**
 * Reads and validates a positive room ID from the route parameter.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @returns The positive route room ID; throws an HTTP 400 error if it is invalid.
 */
function roomIdFromRequest(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw createHttpError('Invalid room id', 400);
  return id;
}

/**
 * Returns the active room list.
 * @param _req Express request parameter; unused because the handler does not need request data.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function listRooms(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.listRooms());
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a room from the request body and responds with HTTP 201.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await roomService.createRoom(req.body));
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the room identified by the route parameter.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getRoom(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.getRoom(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

/**
 * Updates the room identified by the route parameter using the request body.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function updateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.updateRoom(Number(req.params.id), req.body));
  } catch (error) {
    next(error);
  }
}

/**
 * Creates a signed upload request for a room image.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function createRoomImageUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await roomImageService.createRoomImageUpload(
      roomIdFromRequest(req),
      req.body.contentType,
      req.body.contentLength,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Attaches the uploaded image key from the request body to the specified room.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function attachRoomImage(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomImageService.attachRoomImage(roomIdFromRequest(req), req.body.objectKey));
  } catch (error) {
    next(error);
  }
}

/**
 * Removes the image associated with the specified room.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function removeRoomImage(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomImageService.removeRoomImage(roomIdFromRequest(req)));
  } catch (error) {
    next(error);
  }
}

/**
 * Archives the room identified by the route parameter.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function archiveRoom(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.archiveRoom(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

/**
 * Changes the room status using the status in the request body.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function updateRoomStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.updateRoomStatus(Number(req.params.id), req.body?.status));
  } catch (error) {
    next(error);
  }
}

/**
 * Finds available rooms using startAt, endAt, capacity, and amenityIds query values.
 * @param req Request containing the room route ID, request body, or availability query values used by this handler.
 * @param res Express response used to send the room operation result.
 * @param next Express callback used to forward room-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
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
