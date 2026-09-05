import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProfile,
  updateProfile,
  deactivateAccount,
} from '../controllers/profileController';

const router = Router();

router.use(authenticate);

router.get('/me', getProfile);
router.patch('/user', updateProfile);
router.delete('/user', deactivateAccount);

export default router;