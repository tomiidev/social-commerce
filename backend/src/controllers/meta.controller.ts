/**
 * meta.controller.ts
 *
 * Handles the full OAuth connection flow for Meta (Facebook / Instagram):
 *
 *  GET  /api/meta/auth/url        — Generate the Meta OAuth URL
 *  GET  /api/meta/auth/callback   — Exchange code → tokens, persist in Store
 *  GET  /api/meta/status          — Return connection status for this store
 *  POST /api/meta/disconnect      — Remove Meta credentials from the store
 *  POST /api/meta/sync/posts      — Sync latest posts from IG + FB into DB
 *
 * The state parameter in the OAuth URL encodes the JWT of the current user
 * so the callback can identify which store to update.
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Store } from '../models/Store';
import { Post } from '../models/Post';
import {
  getOAuthUrl,
  exchangeCodeForToken,
  getLongLivedUserToken,
  getManagedPages,
  getInstagramAccountId,
} from '../services/meta.service';
import { createProvider } from '../services/SocialProvider';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'socialflow_secret';

// ---------------------------------------------------------------------------
// GET /api/meta/auth/url
// Returns the Meta OAuth URL the frontend should redirect the user to.
// ---------------------------------------------------------------------------

export const getAuthUrl = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    // Encode storeId in the OAuth state param so we can retrieve it in the callback
    const state = jwt.sign({ storeId }, JWT_SECRET, { expiresIn: '10m' });
    const url = getOAuthUrl(state);

    return res.status(200).json({ url });
  } catch (err: any) {
    console.error('[Meta] getAuthUrl error:', err?.message);
    if (err.message?.includes('META_APP_ID')) {
      return res.status(503).json({
        error: 'META_APP_ID no configurado. Agrega las variables de Meta al .env para usar esta función.',
      });
    }
    return res.status(500).json({ error: 'Error al generar URL de autorización' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/meta/auth/callback
// Meta redirects here after the user grants permissions.
// Exchanges the code, retrieves page + IG account info, persists in DB,
// then redirects the user back to the frontend dashboard.
// ---------------------------------------------------------------------------

export const handleOAuthCallback = async (req: Request, res: Response) => {
  const { code, state, error: oauthError } = req.query as Record<string, string>;

  // User denied access
  if (oauthError) {
    console.warn('[Meta] OAuth denied by user:', oauthError);
    return res.redirect(`${FRONTEND_URL}/settings?meta=denied`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/settings?meta=error&reason=missing_params`);
  }

  try {
    // Decode state to recover the storeId
    const payload = jwt.verify(state, JWT_SECRET) as { storeId: string };
    const storeId = payload.storeId;

    // Exchange the one-time code for a short-lived user token
    const shortLivedToken = await exchangeCodeForToken(code);

    // Upgrade to a long-lived user token (~60 days)
    const longLivedUserToken = await getLongLivedUserToken(shortLivedToken);

    // Get the list of pages the user manages (includes IG Business Account info)
    const pages = await getManagedPages(longLivedUserToken);

    if (pages.length === 0) {
      console.warn('[Meta] No Facebook Pages found for this account');
      return res.redirect(`${FRONTEND_URL}/settings?meta=error&reason=no_pages`);
    }

    // Use the first page (multi-page support can be added later via a selection UI)
    const page = pages[0];
    const pageId = page.id;
    const pageAccessToken = page.access_token;

    // Resolve the IG Business Account linked to this page
    let instagramAccountId = page.instagram_business_account?.id ?? '';
    if (!instagramAccountId) {
      instagramAccountId = await getInstagramAccountId(pageId, pageAccessToken);
    }

    // Persist credentials in the Store
    await Store.findByIdAndUpdate(storeId, {
      metaConnected: true,
      metaPageId: pageId,
      metaPageAccessToken: pageAccessToken,
      instagramAccountId,
    });

    console.log(
      `[Meta] Store ${storeId} connected — pageId=${pageId}, igAccountId=${instagramAccountId}`
    );

    return res.redirect(`${FRONTEND_URL}/settings?meta=connected`);
  } catch (err: any) {
    console.error('[Meta] handleOAuthCallback error:', err?.message);
    return res.redirect(`${FRONTEND_URL}/settings?meta=error&reason=server_error`);
  }
};

// ---------------------------------------------------------------------------
// GET /api/meta/status
// Returns the Meta connection state for the current store.
// ---------------------------------------------------------------------------

export const getMetaStatus = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const store = await Store.findById(storeId).select(
      'metaConnected metaPageId instagramAccountId'
    );

    if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

    return res.status(200).json({
      connected: store.metaConnected,
      pageId: store.metaPageId || null,
      instagramAccountId: store.instagramAccountId || null,
      // Never expose the access token to the client
    });
  } catch (err: any) {
    console.error('[Meta] getMetaStatus error:', err?.message);
    return res.status(500).json({ error: 'Error al obtener estado de conexión' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/meta/disconnect
// Clears Meta credentials from the store.
// ---------------------------------------------------------------------------

export const disconnectMeta = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    await Store.findByIdAndUpdate(storeId, {
      metaConnected: false,
      metaPageId: '',
      metaPageAccessToken: '',
      instagramAccountId: '',
    });

    return res.status(200).json({ message: 'Cuenta de Meta desconectada correctamente' });
  } catch (err: any) {
    console.error('[Meta] disconnectMeta error:', err?.message);
    return res.status(500).json({ error: 'Error al desconectar cuenta de Meta' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/meta/connect-simulated
// Connects Meta in simulated mode (development/fallback)
// ---------------------------------------------------------------------------

export const connectSimulated = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    await Store.findByIdAndUpdate(storeId, {
      metaConnected: true,
      metaPageId: 'simulated_page_12345',
      metaPageAccessToken: 'simulated_page_access_token_xyz',
      instagramAccountId: 'simulated_instagram_12345',
      metaWebhookVerifyToken: 'your_custom_random_verify_token',
    });

    return res.status(200).json({ message: 'Conexión simulada de desarrollo activada correctamente' });
  } catch (err: any) {
    console.error('[Meta] connectSimulated error:', err?.message);
    return res.status(500).json({ error: 'Error al activar conexión simulada' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/meta/sync/posts
// Fetches the latest posts from IG + FB and upserts them in the Posts collection.
// Falls back to simulated data if no Meta account is connected.
// ---------------------------------------------------------------------------

export const syncPosts = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

    const credentials =
      store.metaConnected && store.metaPageAccessToken && store.metaPageId
        ? {
            pageId: store.metaPageId,
            pageAccessToken: store.metaPageAccessToken,
            instagramAccountId: store.instagramAccountId ?? '',
          }
        : null;

    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    let totalSynced = 0;
    const warnings: string[] = [];

    // Sync Instagram posts — isolated so FB can still run if IG fails
    try {
      const igProvider = createProvider('instagram', credentials);
      const igPosts = await igProvider.syncPosts(storeId);
      for (const post of igPosts) {
        await Post.findOneAndUpdate(
          { storeId: storeObjectId, image: post.image, channel: 'instagram' },
          { ...post, storeId: storeObjectId },
          { upsert: true, new: true }
        );
        totalSynced++;
      }
    } catch (igErr: any) {
      console.warn('[Meta] Instagram sync failed:', igErr?.message);
      warnings.push(`Instagram: ${igErr?.message}`);
    }

    // Sync Facebook posts — isolated so IG can still run if FB fails
    try {
      const fbProvider = createProvider('facebook', credentials);
      const fbPosts = await fbProvider.syncPosts(storeId);
      for (const post of fbPosts) {
        await Post.findOneAndUpdate(
          { storeId: storeObjectId, image: post.image, channel: 'facebook' },
          { ...post, storeId: storeObjectId },
          { upsert: true, new: true }
        );
        totalSynced++;
      }
    } catch (fbErr: any) {
      console.warn('[Meta] Facebook sync failed:', fbErr?.message);
      warnings.push(`Facebook: ${fbErr?.message}`);
    }

    return res.status(200).json({
      message: totalSynced > 0
        ? `Sincronización completada`
        : `Sincronización completada sin nuevas publicaciones`,
      synced: totalSynced,
      mode: credentials ? 'real' : 'simulated',
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err: any) {
    console.error('[Meta] syncPosts error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Error al sincronizar publicaciones' });
  }
};
