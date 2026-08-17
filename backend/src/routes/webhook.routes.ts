/**
 * webhook.routes.ts
 *
 * Routes for the Meta webhook endpoint.
 *
 * Note: rawBody capture middleware is applied here so the signature verifier
 * in meta.service.ts gets the original Buffer before express.json() parses it.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { verifyWebhook, handleWebhook } from '../controllers/webhook.controller';

const router = Router();

/**
 * Capture the raw request body as a Buffer before JSON parsing.
 * Required for HMAC-SHA256 signature verification.
 */
function captureRawBody(req: Request, _res: Response, next: NextFunction) {
  let data = Buffer.alloc(0);
  req.on('data', (chunk: Buffer) => {
    data = Buffer.concat([data, chunk]);
  });
  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
}

// GET  /api/webhook/meta — Meta challenge verification
router.get('/', verifyWebhook);

// POST /api/webhook/meta — Incoming message events
router.post('/', captureRawBody, handleWebhook);

export default router;
