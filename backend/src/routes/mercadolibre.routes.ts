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

// Sales import
router.post('/sales/import', protect, controller.importMeliSales);

// Customers import
router.post('/customers/import', protect, controller.importMeliCustomers);

export default router;
