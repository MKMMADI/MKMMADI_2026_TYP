import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import { archiveRoom, createRoom, getRoom, listRoomOccupancy, listRooms, searchAvailability, updateRoom } from '../controllers/roomController';

const router = Router();

router.get('/availability', authenticate, searchAvailability);
router.get('/occupancy', authenticate, listRoomOccupancy);
router.get('/', authenticate, listRooms);
router.post('/', authenticate, requireRoles(['MANAGER']), createRoom);
router.get('/:id', authenticate, getRoom);
router.patch('/:id', authenticate, requireRoles(['MANAGER']), updateRoom);
router.delete('/:id', authenticate, requireRoles(['MANAGER']), archiveRoom);

export default router;
