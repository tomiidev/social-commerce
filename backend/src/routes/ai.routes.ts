import { Router } from 'express';
import { 
    suggestResponse, 
    chatAssistant, 
    handlePredefinedQuestion,
    getAIConversations,
    createAIConversation,
    updateAIConversation, 
    getAIConversationById
} from '../controllers/ai.controller';
import { protect } from '../middleware/auth';
import { Store } from '../models/Store';

const router = Router();

router.use(protect);

// AI Conversation Management
router.get('/conversations', getAIConversations);
router.get('/conversations/:id', getAIConversationById);
router.post('/conversations', createAIConversation);
router.put('/conversations/:id', updateAIConversation);

router.post('/suggest-response', suggestResponse);
router.post('/chat', chatAssistant);
router.post('/predefined-question', handlePredefinedQuestion);

// Get token usage
router.get('/token-usage', async (req, res) => {
    const storeId = (req as any).user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });
    
    const store = await Store.findById(storeId).select('aiTokensUsed aiTokenLimit');
    if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });
    
    res.json({
        tokensUsed: store.aiTokensUsed,
        tokenLimit: store.aiTokenLimit
    });
});

export default router;
