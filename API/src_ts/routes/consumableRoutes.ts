import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  listConsumables,
  getConsumable,
  createConsumable,
  updateConsumable,
  deleteConsumable,
  adjustStock,
  getStockAdjustments,
  getLowStockItems,
} from '../controllers/consumableController';

const router = Router();

router.use(authenticate);

router.get('/', listConsumables);
router.get('/low-stock', getLowStockItems);
router.get('/:id', getConsumable);
router.get('/:id/adjustments', getStockAdjustments);

router.post('/', requireRoles(['MANAGER', 'CLERK']), createConsumable);
router.patch('/:id', requireRoles(['MANAGER', 'CLERK']), updateConsumable);
router.post('/:id/adjust', requireRoles(['MANAGER', 'CLERK']), adjustStock);
router.delete('/:id', requireRoles(['MANAGER']), deleteConsumable);

export default router;
