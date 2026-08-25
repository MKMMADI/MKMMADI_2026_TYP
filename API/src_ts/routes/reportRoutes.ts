import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth';
import {
  getAvailabilityReport,
  getUsageReport,
  getPopularityReport,
} from '../controllers/reportController';

const router = Router();

router.use(authenticate);
router.use(requireRoles(['MANAGER', 'CLERK']));

router.get('/availability', getAvailabilityReport);
router.get('/usage', getUsageReport);
router.get('/popularity', getPopularityReport);

export default router;
