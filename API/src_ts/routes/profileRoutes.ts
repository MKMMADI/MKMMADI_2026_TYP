/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Defines the Express endpoints for profile API operations.
 */

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