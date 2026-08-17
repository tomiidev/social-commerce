/**
 * meta.routes.ts
 *
 * Routes for Meta (Facebook / Instagram) account management.
 *
 * Protected routes require a valid JWT (protect middleware).
 * The OAuth callback is public — Meta redirects here with the code.
 */

import { Router } from 'express';
import {
  getAuthUrl,
  handleOAuthCallback,
  getMetaStatus,
  disconnectMeta,
  connectSimulated,
  syncPosts,
} from '../controllers/meta.controller';
import { protect } from '../middleware/auth';

const router = Router();

// Public — Meta redirects here after the user authorizes the app
// (No protect middleware: the user is not authenticated via cookie at this point)
router.get('/auth/callback', handleOAuthCallback);

// Protected routes
router.use(protect);

router.get('/auth/url', getAuthUrl);           // Get the OAuth URL to redirect the user to
router.get('/status', getMetaStatus);           // Current connection status for this store
router.post('/disconnect', disconnectMeta);     // Remove Meta credentials
router.post('/connect-simulated', connectSimulated); // Simulated fallback connection for development
router.post('/sync/posts', syncPosts);          // Trigger post synchronization

export default router;
