import { Router } from 'express';
import { getAnalytics } from '../controllers/analytics.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getAnalytics);

export default router;
