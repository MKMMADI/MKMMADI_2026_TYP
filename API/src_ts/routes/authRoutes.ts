/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Defines the Express endpoints for auth API operations.
 */

import { Router } from 'express';
import { signup, signupManager, login, refresh, logout } from '../controllers/authController';
import { authenticate, requireRole } from '../middleware/auth';
import { validateSignup, validateLogin, validateRefresh } from '../middleware/validation';

const router = Router();

router.post('/register-manager', validateSignup, signupManager);
router.post('/register', authenticate, requireRole('MANAGER'), validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/refresh', validateRefresh, refresh);
router.post('/logout', authenticate, logout);

export default router;
