import { Router } from 'express';
import { register, login, logout, me, getConnections } from '../controllers/auth.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, me);
router.get('/connections', protect, getConnections);

export default router;
