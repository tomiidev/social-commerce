import { Router } from 'express';
import { initiateAuth, handleCallback, getShopifyStatus, disconnectShopify } from '../controllers/shopify.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/auth/url', protect, initiateAuth);
router.get('/auth/callback', handleCallback);
router.get('/status', protect, getShopifyStatus);
router.post('/disconnect', protect, disconnectShopify);

export default router;
