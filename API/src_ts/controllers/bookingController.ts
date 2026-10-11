import { NextFunction, Response } from 'express';
import { createBooking, rescheduleDisplacedBooking, listBookings as fetchBookings, listAssignableClerks as fetchAssignableClerks,
  assignBookingClerk as assignClerk, getBooking as findBooking, approveBooking as approve,
  rejectBooking as reject, updateBookingStatus as updateStatus, cancelBooking as cancel,
  listOccupancy as getOccupancy } from '../services/bookingService';
import { createHttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/auth';
import { REJECTION_REASONS } from '../constants/rejectionReasons';
import { publishBookingUpdate } from '../services/realtime';

function parseBookingId(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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

export async function listBookings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await listBookingsService(req));
  } catch (error) { next(error); }
}

async function listBookingsService(req: AuthRequest) {
  return fetchBookings(req.user?.role, req.user.id, typeof req.query.status === 'string' ? req.query.status : undefined);
}

export async function listAssignableClerks(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(await fetchAssignableClerks()); } catch (error) { next(error); }
}

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

export async function getBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    res.json(await findBooking(id, req.user.id, req.user.role));
  } catch (error) { next(error); }
}

export async function listRejectionReasons(_req: AuthRequest, res: Response, next: NextFunction) {
  try { res.json(REJECTION_REASONS); } catch (error) { next(error); }
}

export async function approveBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    const booking = await approve(id, req.user.id);
    publishBookingUpdate(booking.employeeId, { bookingId: booking.id, status: booking.status });
    res.json(booking);
  } catch (error) { next(error); }
}

export async function rejectBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    res.json(await reject(id, req.user.id, req.body?.reasonCode, req.body?.note));
  } catch (error) { next(error); }
}

export async function updateBookingStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    res.json(await updateStatus(id, req.body?.status, req.user.id));
  } catch (error) { next(error); }
}

export async function cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseBookingId(req.params.id);
    if (id == null) return next(createHttpError('Invalid booking id', 400));
    res.json(await cancel(id, req.user.id, req.user.role));
  } catch (error) { next(error); }
}

/** Occupancy windows for all rooms (no PII) — used by employee home availability. */
export async function listOccupancy(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await getOccupancy(
      req.query.from === undefined ? undefined : String(req.query.from),
      req.query.to === undefined ? undefined : String(req.query.to),
    ));
  } catch (error) { next(error); }
}
