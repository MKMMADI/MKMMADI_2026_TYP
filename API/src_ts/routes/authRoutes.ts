import { Router } from 'express';
import { signup, login, refresh, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

export default router;
