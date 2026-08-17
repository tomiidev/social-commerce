import { Router } from 'express';
import { getConversations, getConversationMessages, sendMessage, markAsRead } from '../controllers/conversation.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', getConversations);
router.get('/:id', getConversationMessages);
router.post('/:id/messages', sendMessage);
router.put('/:id/read', markAsRead);

export default router;
