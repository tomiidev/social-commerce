import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Store } from '../models/Store';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SCOPES = 'read_products,read_orders'; // Adjust as needed
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'socialflow_secret';

export const initiateAuth = async (req: AuthRequest, res: Response) => {
  const { shop } = req.query;
  const storeId = req.user?.storeId;

  if (!shop) return res.status(400).json({ error: 'Shop URL is required' });
  if (!storeId) return res.status(401).json({ error: 'No autorizado' });

  const state = jwt.sign({ storeId }, JWT_SECRET, { expiresIn: '10m' });
  
  // Ensure BACKEND_URL starts with https://
  let baseUrl = BACKEND_URL;
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  const redirectUri = `${baseUrl}/api/shopify/auth/callback`;
  
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SHOPIFY_SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return res.status(200).json({ url: authUrl });
};

export const handleCallback = async (req: Request, res: Response) => {
  const { code, shop, state } = req.query as Record<string, string>;

  if (!code || !shop || !state) return res.redirect(`${FRONTEND_URL}/settings?shopify=error&reason=missing_params`);

  try {
    const payload = jwt.verify(state, JWT_SECRET) as { storeId: string };
    
    // Exchange code for token
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    });

    await Store.findByIdAndUpdate(payload.storeId, {
      shopifyConnected: true,
      shopifyShopUrl: shop,
      shopifyAccessToken: tokenResponse.data.access_token,
    });

    return res.redirect(`${FRONTEND_URL}/settings?shopify=connected`);
  } catch (err: any) {
    console.error('[Shopify] handleCallback error:', err?.message);
    return res.redirect(`${FRONTEND_URL}/settings?shopify=error&reason=server_error`);
  }
};

// Existing methods...
export const getShopifyStatus = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const store = await Store.findById(storeId).select('shopifyConnected');
    if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

    return res.status(200).json({ connected: store.shopifyConnected });
  } catch (err: any) {
    console.error('[Shopify] getShopifyStatus error:', err?.message);
    return res.status(500).json({ error: 'Error al obtener estado' });
  }
};

export const disconnectShopify = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    await Store.findByIdAndUpdate(storeId, {
      shopifyConnected: false,
      shopifyShopUrl: '',
      shopifyAccessToken: '',
    });

    return res.status(200).json({ message: 'Conexión con Shopify eliminada' });
  } catch (err: any) {
    console.error('[Shopify] disconnectShopify error:', err?.message);
    return res.status(500).json({ error: 'Error al desconectar' });
  }
};
