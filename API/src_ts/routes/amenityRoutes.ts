import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import { archiveAmenity, createAmenity, listAmenities, updateAmenity } from '../controllers/amenityController';

const router = Router();

router.get('/', authenticate, listAmenities);
router.post('/', authenticate, requireRoles(['MANAGER']), createAmenity);
router.patch('/:id', authenticate, requireRoles(['MANAGER']), updateAmenity);
router.delete('/:id', authenticate, requireRoles(['MANAGER']), archiveAmenity);

export default router;
