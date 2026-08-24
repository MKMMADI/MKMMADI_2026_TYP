import { Router } from 'express';
import { signup, signupManager, login, refresh, logout } from '../controllers/authController';
import { authenticate ,requireRole } from '../middleware/auth';

const router = Router();

router.post('/register-manager', signupManager);
router.post('/register', authenticate, requireRole('MANAGER'), signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

export default router;
