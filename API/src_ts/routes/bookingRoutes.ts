import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  approveBooking,
  assignBookingClerk,
  cancelBooking,
  createBookingHandler,
  getBooking,
  listBookings,
  listAssignableClerks,
  listOccupancy,
  listRejectionReasons,
  rejectBooking,
  updateBookingStatus,
} from '../controllers/bookingController';

const router = Router();

router.post('/', authenticate, requireRoles(['EMPLOYEE']), createBookingHandler);
router.get('/', authenticate, listBookings);
router.get('/assignable-clerks', authenticate, requireRoles(['MANAGER']), listAssignableClerks);
router.get('/occupancy', authenticate, listOccupancy);
router.get('/rejection-reasons', authenticate, requireRoles(['MANAGER', 'CLERK']), listRejectionReasons);

router.get('/:id', authenticate, getBooking);
router.patch('/:id/approve', authenticate, requireRoles(['MANAGER']), approveBooking);
router.patch('/:id/reject', authenticate, requireRoles(['MANAGER']), rejectBooking);
router.patch('/:id/assignment', authenticate, requireRoles(['MANAGER']), assignBookingClerk);
// Preparation status (CONFIRMED / PREPARING / READY / COMPLETED) — clerk operational workflow only
router.patch('/:id/status', authenticate, requireRoles(['CLERK']), updateBookingStatus);
router.patch('/:id/cancel', authenticate, cancelBooking);

export default router;
