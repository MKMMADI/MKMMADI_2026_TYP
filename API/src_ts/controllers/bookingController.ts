/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements HTTP request handlers for booking operations.
 */

import { NextFunction, Response } from 'express';
import { createBooking, rescheduleDisplacedBooking, listBookings as fetchBookings, listAssignableClerks as fetchAssignableClerks,
  assignBookingClerk as assignClerk, getBooking as findBooking, approveBooking as approve,
  rejectBooking as reject, updateBookingStatus as updateStatus, cancelBooking as cancel,
  listOccupancy as getOccupancy } from '../services/bookingService';
import { createHttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/auth';
import { REJECTION_REASONS } from '../constants/rejectionReasons';
import { publishBookingUpdate } from '../services/realtime';

/**
 * Parses a route parameter as a positive integer booking ID, returning null if invalid.
 * @param raw Unparsed value supplied by the caller.
 * @returns A positive booking ID, or null when the route parameter is invalid.
 */
function parseBookingId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Creates a booking from the authenticated user and request fields, then responds with HTTP 201.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function createBookingHandler(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const roomIds = Array.isArray(req.body.roomIds) ? req.body.roomIds.map((value: unknown) => Number(value)) : [];
    const amenityIds = Array.isArray(req.body.amenityIds) ? req.body.amenityIds.map((value: unknown) => Number(value)) : [];
    const booking = await createBooking({
      employeeId: req.user?.id, purpose: req.body.purpose, startAt: req.body.startAt,
      endAt: req.body.endAt, roomIds, amenityIds, capacity: Number(req.body.capacity || 0),
    });
    res.status(201).json(booking);
  } catch (error) { next(error); }
}

/**
 * Validates the booking ID and rescheduling choice, then returns the result or forwards errors.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function rescheduleBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    const acceptSuggestion = req.body?.acceptSuggestion === true;
    if (acceptSuggestion && (req.body?.startAt !== undefined || req.body?.endAt !== undefined)) {
      return next(createHttpError('Accept the suggested time or provide a replacement startAt', 400));
    }
    if (!acceptSuggestion && req.body?.startAt === undefined) {
      return next(createHttpError('Provide acceptSuggestion: true or a replacement startAt', 400));
    }
    res.json(await rescheduleDisplacedBooking({
      bookingId: id, employeeId: req.user.id, acceptSuggestion,
      startAt: req.body.startAt, endAt: req.body.endAt,
    }));
  } catch (error) { next(error); }
}

/**
 * Returns bookings visible to the authenticated user, applying the optional status query.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function listBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await listBookingsService(req));
  } catch (error) { next(error); }
}

/**
 * Loads bookings filtered by the authenticated role, user ID, and optional status query.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @returns A promise resolving to the bookings visible under the request’s role, user ID, and optional status.
 */
async function listBookingsService(req: AuthRequest) {
  return fetchBookings(req.user?.role, req.user.id, typeof req.query.status === 'string' ? req.query.status : undefined);
}

/**
 * Returns the clerks eligible to be assigned to bookings.
 * @param _req Express request parameter; unused because the handler does not need request data.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function listAssignableClerks(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(await fetchAssignableClerks()); } catch (error) { next(error); }
}

/**
 * Validates booking and clerk IDs, then assigns or unassigns the clerk.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function assignBookingClerk(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    if (!req.body || !Object.prototype.hasOwnProperty.call(req.body, 'clerkId')) {
      return next(createHttpError('clerkId is required; use null to unassign', 400));
    }
    const rawId: unknown = req.body.clerkId;
    const clerkId = rawId === null ? null : Number(rawId);
    if (clerkId !== null && (!Number.isInteger(clerkId) || clerkId <= 0)) {
      return next(createHttpError('clerkId must be a positive integer or null', 400));
    }
    res.json(await assignClerk(id, clerkId));
  } catch (error) { next(error); }
}

/**
 * Returns the booking if the authenticated user may access it.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function getBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    res.json(await findBooking(id, req.user.id, req.user.role));
  } catch (error) { next(error); }
}

/**
 * Returns the supported booking rejection reasons.
 * @param _req Express request parameter; unused because the handler does not need request data.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function listRejectionReasons(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(REJECTION_REASONS); } catch (error) { next(error); }
}

/**
 * Approves the booking for the authenticated reviewer and publishes a status update.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function approveBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    const booking = await approve(id, req.user.id);
    publishBookingUpdate(booking.employeeId, { bookingId: booking.id, status: booking.status });
    res.json(booking);
  } catch (error) { next(error); }
}

/**
 * Rejects the booking using the supplied reason code and optional note.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function rejectBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    res.json(await reject(id, req.user.id, req.body?.reasonCode, req.body?.note));
  } catch (error) { next(error); }
}

/**
 * Updates the booking status for the authenticated user.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function updateBookingStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    res.json(await updateStatus(id, req.body?.status, req.user.id));
  } catch (error) { next(error); }
}

/**
 * Cancels the booking for the authenticated user and role.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    res.json(await cancel(id, req.user.id, req.user.role));
  } catch (error) { next(error); }
}

/**
 * Returns occupancy windows for the optional query time range without personal information.
 * @param req Authenticated request containing the booking route ID, request body, or query filters used by this handler.
 * @param res Express response used to send the booking operation result.
 * @param next Express callback used to forward booking-operation errors.
 * @returns A promise that resolves after the HTTP response is sent; failures are forwarded to Express error middleware.
 */
export async function listOccupancy(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await getOccupancy(
      req.query.from === undefined ? undefined : String(req.query.from),
      req.query.to === undefined ? undefined : String(req.query.to),
    ));
  } catch (error) { next(error); }
}
