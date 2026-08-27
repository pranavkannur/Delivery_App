import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// /api/auth/register
router.post('/register', register);

// /api/auth/login
router.post('/login', login);

export default router;