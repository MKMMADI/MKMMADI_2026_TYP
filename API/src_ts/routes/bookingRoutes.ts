import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import { cancelBooking, createBookingHandler, getBooking, listBookings, updateBookingStatus } from '../controllers/bookingController';

const router = Router();

router.post('/', authenticate, requireRoles(['EMPLOYEE']), createBookingHandler);
router.get('/', authenticate, listBookings);
router.get('/:id', authenticate, getBooking);
router.patch('/:id/status', authenticate, requireRoles(['CLERK', 'MANAGER']), updateBookingStatus);
router.patch('/:id/cancel', authenticate, cancelBooking);

export default router;
