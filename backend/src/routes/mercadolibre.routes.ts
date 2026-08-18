import { Router } from 'express';
import { protect } from '../middleware/auth';
import * as controller from '../controllers/mercadolibre.controller';

const router = Router();

// OAuth flow
router.get('/auth/url', protect, controller.getAuthUrl);
router.get('/auth/callback', controller.handleOAuthCallback);

// Status and management
router.get('/status', protect, controller.getMeliStatus);
router.post('/disconnect', protect, controller.disconnectMeli);

// Questions
router.get('/items/:itemId/questions', protect, controller.getProductQuestions);

export default router;
