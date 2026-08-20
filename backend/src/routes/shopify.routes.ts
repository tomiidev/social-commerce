import { Router } from 'express';
import * as controller from '../controllers/shopify.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/auth/url', protect, controller.initiateAuth);
router.get('/auth/callback', controller.handleCallback);
router.get('/status', protect, controller.getShopifyStatus);
router.post('/disconnect', protect, controller.disconnectShopify);

// Sales import
router.post('/sales/import', protect, controller.importShopifySales);

// Customers import
router.post('/customers/import', protect, controller.importShopifyCustomers);

// POST /api/shopify/webhook — Shopify inventory updates
router.post('/webhook', controller.handleShopifyWebhook);

export default router;
