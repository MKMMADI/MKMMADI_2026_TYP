import { NextFunction, Request, Response } from 'express';
import { createHttpError } from '../utils/httpError';

function validateStringField(value: unknown, field: string, message: string) {
  return typeof value === 'string' && value.trim().length > 0 ? null : createHttpError(message, 400);
}

export function validateSignup(req: Request, res: Response, next: NextFunction) {
  const { name, email, password, department, contactNumber } = req.body ?? {};

  if (validateStringField(name, 'name', 'Missing fields')) {
    return next(createHttpError('Missing fields', 400));
  }
  if (validateStringField(email, 'email', 'Missing fields')) {
    return next(createHttpError('Missing fields', 400));
  }
  if (validateStringField(password, 'password', 'Missing fields')) {
    return next(createHttpError('Missing fields', 400));
  }

  if (department !== undefined && (typeof department !== 'string' || department.trim().length === 0)) {
    return next(createHttpError('Department must be a non-empty string when provided', 400));
  }
  if (contactNumber !== undefined && (typeof contactNumber !== 'string' || contactNumber.trim().length === 0)) {
    return next(createHttpError('Contact number must be a non-empty string when provided', 400));
  }

  return next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return next(createHttpError('Missing fields', 400));
  }
  return next();
}

export function validateRefresh(req: Request, res: Response, next: NextFunction) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    return next(createHttpError('Missing refreshToken', 400));
  }
  return next();
}

export function validateCreateRoom(req: Request, res: Response, next: NextFunction) {
  const { name, capacity, status, amenityIds } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return next(createHttpError('Name and capacity are required', 400));
  }

  const numericCapacity = Number(capacity);
  if (!Number.isInteger(numericCapacity) || numericCapacity <= 0) {
    return next(createHttpError('Name and capacity are required', 400));
  }

  if (status !== undefined && typeof status !== 'string') {
    return next(createHttpError('Status must be a string', 400));
  }

  if (amenityIds !== undefined && (!Array.isArray(amenityIds) || amenityIds.some((value) => !Number.isInteger(Number(value)) || Number(value) <= 0))) {
    return next(createHttpError('Amenity IDs must be a list of positive integers', 400));
  }

  return next();
}

export function validateUpdateRoom(req: Request, res: Response, next: NextFunction) {
  const { name, capacity, status, amenityIds } = req.body ?? {};

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return next(createHttpError('Room name must be a non-empty string', 400));
  }

  if (capacity !== undefined) {
    const numericCapacity = Number(capacity);
    if (!Number.isInteger(numericCapacity) || numericCapacity <= 0) {
      return next(createHttpError('Capacity must be a positive whole number', 400));
    }
  }

  if (status !== undefined && typeof status !== 'string') {
    return next(createHttpError('Status must be a string', 400));
  }

  if (amenityIds !== undefined && (!Array.isArray(amenityIds) || amenityIds.some((value) => !Number.isInteger(Number(value)) || Number(value) <= 0))) {
    return next(createHttpError('Amenity IDs must be a list of positive integers', 400));
  }

  return next();
}

export function validateCreateBooking(req: Request, res: Response, next: NextFunction) {
  const { roomIds, purpose, startAt, endAt, capacity } = req.body ?? {};

  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    return next(createHttpError('At least one room is required', 400));
  }
  if (!Array.isArray(roomIds) || roomIds.some((value) => !Number.isInteger(Number(value)) || Number(value) <= 0)) {
    return next(createHttpError('All rooms must be valid', 400));
  }
  if (!purpose || typeof purpose !== 'string' || purpose.trim().length === 0) {
    return next(createHttpError('Purpose is required', 400));
  }
  if (!startAt || !endAt) {
    return next(createHttpError('Start and end times are required', 400));
  }
  if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
    return next(createHttpError('Capacity must be a positive whole number', 400));
  }

  return next();
}

export function validateRescheduleBooking(req: Request, res: Response, next: NextFunction) {
  const { acceptSuggestion, startAt, endAt } = req.body ?? {};

  const hasReplacement = startAt !== undefined || endAt !== undefined;
  if (acceptSuggestion === true && hasReplacement) {
    return next(createHttpError('Accept the suggested time or provide a replacement startAt', 400));
  }
  if (acceptSuggestion !== true && !hasReplacement) {
    return next(createHttpError('Provide acceptSuggestion: true or a replacement startAt', 400));
  }
  if (startAt !== undefined && typeof startAt !== 'string' && !(startAt instanceof Date)) {
    return next(createHttpError('Invalid startAt', 400));
  }
  if (endAt !== undefined && typeof endAt !== 'string' && !(endAt instanceof Date)) {
    return next(createHttpError('Invalid endAt', 400));
  }

  return next();
}

export function validateConversationMessage(req: Request, res: Response, next: NextFunction) {
  const { body } = req.body ?? {};
  if (typeof body !== 'string') {
    return next(createHttpError('Message body is required', 400));
  }
  if (body.trim().length === 0) {
    return next(createHttpError('Message body is required', 400));
  }
  if (body.length > 4000) {
    return next(createHttpError('Message cannot exceed 4000 characters', 400));
  }
  return next();
}
