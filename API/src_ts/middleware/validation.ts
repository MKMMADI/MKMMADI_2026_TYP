/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements validation Express middleware for API requests.
 */

import { NextFunction, Request, Response } from 'express';
import { createHttpError } from '../utils/httpError';
import { MAX_ROOM_IMAGE_BYTES, ROOM_IMAGE_CONTENT_TYPES } from '../constants/roomImages';

/**
 * Checks that the value is a non-empty string and returns an HTTP 400 error if not.
 * @param value Candidate field value to check for a non-empty string.
 * @param field Name of the field being checked.
 * @param message Error message to use when the string is invalid.
 * @returns Null for a non-empty string, or an HTTP 400 error when the value is invalid.
 */
function validateStringField(value: unknown, field: string, message: string) {
  return typeof value === 'string' && value.trim().length > 0 ? null : createHttpError(message, 400);
}

/**
 * Requires non-empty name, email, and password; validates optional department and contact number.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
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

/**
 * Requires both email and password in the request body.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return next(createHttpError('Missing fields', 400));
  }
  return next();
}

/**
 * Requires a non-empty string refresh token.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
export function validateRefresh(req: Request, res: Response, next: NextFunction) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
    return next(createHttpError('Missing refreshToken', 400));
  }
  return next();
}

/**
 * Validates required room name and positive capacity, plus optional status, HTTPS image URL, and amenity IDs.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
export function validateCreateRoom(req: Request, res: Response, next: NextFunction) {
  const { name, capacity, status, amenityIds, imageUrl } = req.body ?? {};

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

  if (imageUrl !== undefined && imageUrl !== null && !isHttpsUrl(imageUrl)) {
    return next(createHttpError('Image URL must be a valid HTTPS URL or null', 400));
  }

  if (amenityIds !== undefined && (!Array.isArray(amenityIds) || amenityIds.some((value) => !Number.isInteger(Number(value)) || Number(value) <= 0))) {
    return next(createHttpError('Amenity IDs must be a list of positive integers', 400));
  }

  return next();
}

/**
 * Validates only room fields supplied for update, including positive capacity and amenity IDs.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
export function validateUpdateRoom(req: Request, res: Response, next: NextFunction) {
  const { name, capacity, status, amenityIds, imageUrl } = req.body ?? {};

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

  if (imageUrl !== undefined && imageUrl !== null && !isHttpsUrl(imageUrl)) {
    return next(createHttpError('Image URL must be a valid HTTPS URL or null', 400));
  }

  if (amenityIds !== undefined && (!Array.isArray(amenityIds) || amenityIds.some((value) => !Number.isInteger(Number(value)) || Number(value) <= 0))) {
    return next(createHttpError('Amenity IDs must be a list of positive integers', 400));
  }

  return next();
}

/**
 * Requires an allowed image MIME type and a positive content length within the configured limit.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
export function validateRoomImageUpload(req: Request, res: Response, next: NextFunction) {
  const { contentType, contentLength } = req.body ?? {};
  if (!ROOM_IMAGE_CONTENT_TYPES.includes(contentType)) {
    return next(createHttpError('Image must be JPEG, PNG, or WebP', 400));
  }
  if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > MAX_ROOM_IMAGE_BYTES) {
    return next(createHttpError(`Image must be between 1 byte and ${MAX_ROOM_IMAGE_BYTES} bytes`, 400));
  }
  return next();
}

/**
 * Requires a non-empty object key for the uploaded room image.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
export function validateAttachRoomImage(req: Request, res: Response, next: NextFunction) {
  const { objectKey } = req.body ?? {};
  if (typeof objectKey !== 'string' || objectKey.trim() === '') {
    return next(createHttpError('objectKey is required', 400));
  }
  return next();
}

/**
 * Returns whether the value parses as a URL using the HTTPS protocol.
 * @param value Candidate field value to check for a non-empty string.
 * @returns True when the value is a valid HTTPS URL; otherwise false.
 */
function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Requires at least one positive room ID, a non-empty purpose, start and end times, and positive capacity.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
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

/**
 * Requires a replacement time or suggestion acceptance and rejects incompatible or invalid time fields.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
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

/**
 * Requires non-empty message text no longer than 4,000 characters.
 * @param req Express request whose body is being validated.
 * @param res Express response supplied by the middleware pipeline; this validator does not send directly.
 * @param next Express callback used to continue on valid input or forward a validation error.
 * @returns No value; calls next() when valid or forwards a validation error.
 */
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
