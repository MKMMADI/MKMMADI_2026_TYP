import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import { archiveRoom, createRoom, getRoom, listRooms, searchAvailability, updateRoom } from '../controllers/roomController';
import { validateCreateRoom, validateUpdateRoom } from '../middleware/validation';

const router = Router();

router.get('/availability', authenticate, searchAvailability);
router.get('/', authenticate, listRooms);
router.post('/', authenticate, requireRoles(['MANAGER']), validateCreateRoom, createRoom);
router.get('/:id', authenticate, getRoom);
router.patch('/:id', authenticate, requireRoles(['MANAGER']), validateUpdateRoom, updateRoom);
router.delete('/:id', authenticate, requireRoles(['MANAGER']), archiveRoom);

export default router;
