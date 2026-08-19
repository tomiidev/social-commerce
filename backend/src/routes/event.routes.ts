import { Router } from 'express';
import { getRecentEvents } from '../controllers/event.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getRecentEvents);

export default router;
