import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  approveBooking,
  cancelBooking,
  createBookingHandler,
  getBooking,
  listBookings,
  listRejectionReasons,
  rejectBooking,
  updateBookingStatus,
} from '../controllers/bookingController';

const router = Router();

router.post('/', authenticate, requireRoles(['EMPLOYEE']), createBookingHandler);
router.get('/', authenticate, listBookings);
router.get('/rejection-reasons', authenticate, requireRoles(['MANAGER', 'CLERK']), listRejectionReasons);

router.get('/:id', authenticate, getBooking);
router.patch('/:id/approve', authenticate, requireRoles(['MANAGER']), approveBooking);
router.patch('/:id/reject', authenticate, requireRoles(['MANAGER']), rejectBooking);
router.patch('/:id/status', authenticate, requireRoles(['CLERK', 'MANAGER']), updateBookingStatus);
router.patch('/:id/cancel', authenticate, cancelBooking);

export default router;
