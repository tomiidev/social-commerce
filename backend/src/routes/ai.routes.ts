import { Router } from 'express';
import { suggestResponse, chatAssistant } from '../controllers/ai.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.post('/suggest-response', suggestResponse);
router.post('/chat', chatAssistant);

export default router;
