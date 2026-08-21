import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { StoreConnections } from '../models/StoreConnections';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { ShopifyService } from '../services/shopify.service';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';

// ... existing code ...

export const importShopifyCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });
    if (!connections || !connections.shopifyAccessToken || !connections.shopifyShopUrl) {
      return res.status(400).json({ error: 'Tienda no conectada a Shopify' });
    }

    const customers = await ShopifyService.syncCustomers(connections.shopifyShopUrl, connections.shopifyAccessToken);

    let importedCount = 0;
    for (const customerData of customers) {
      const existingCustomer = await Customer.findOne({
        storeId,
        externalId: customerData.externalId,
        channel: 'shopify'
      });

      if (!existingCustomer) {
        await Customer.create({
          storeId,
          ...customerData
        });
        importedCount++;
      }
    }

    return res.status(200).json({ message: `Se importaron ${importedCount} clientes.` });
  } catch (err: any) {
    if (err.response) {
      console.error('[Shopify] importShopifyCustomers error response:', JSON.stringify(err.response.data, null, 2));
    }
    console.error('[Shopify] importShopifyCustomers error:', err?.message);
    return res.status(500).json({ error: 'Error al importar clientes de Shopify' });
  }
};

// POST /api/shopify/sales/import
// ---------------------------------------------------------------------------

export const importShopifySales = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });
    if (!connections || !connections.shopifyAccessToken || !connections.shopifyShopUrl) {
      return res.status(400).json({ error: 'Tienda no conectada a Shopify' });
    }

    const { shopifyShopUrl, shopifyAccessToken } = connections;
    const client = axios.create({
      baseURL: `https://${shopifyShopUrl}/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': shopifyAccessToken,
        'Content-Type': 'application/json',
      },
    });

    const response = await client.get('/orders.json?status=any');
    const orders = response.data.orders;

    for (const order of orders) {
      console.log(`[Shopify] Processing order ${order.id}`);
      console.log(`[Shopify] Order structure keys:`, Object.keys(order));
      console.log(`[Shopify] Order customer:`, JSON.stringify(order.customer));
      
      if (!order) {
        console.warn(`[Shopify] Skipping invalid order`);
        continue;
      }

      // 1. Find or create Customer
      const email = order.customer?.email;
      let customer = null;
      if (email) {
        customer = await Customer.findOne({ storeId, email, channel: 'shopify' });
      }

      if (!customer) {
        // Create new customer if not found
        customer = await Customer.create({
          storeId,
          name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim() || 'Cliente Shopify',
          username: order.customer?.email || 'shopify_customer',
          email: order.customer?.email,
          channel: 'shopify',
          externalId: order.customer?.id?.toString(),
        });
      }

      // 2. Find Product (using first item as primary)
      const lineItem = order.line_items?.[0];
      let productId = null;
      if (lineItem?.sku) {
        const product = await Product.findOne({ storeId, sku: lineItem.sku });
        productId = product?._id;
      }

      // Map Shopify order to Sale
      const saleData = {
        storeId,
        customerId: customer._id,
        productId: productId || null, // Keep null if product not found
        amount: parseFloat(order.total_price),
        date: new Date(order.created_at),
        channel: 'shopify',
        status: order.financial_status === 'paid' ? 'confirmed' : 'pending',
        rawOrderData: order, // Store full order JSON
      };
      
      console.log(`[Shopify] Attempting to save sale for order ${order.id}. Sale data:`, JSON.stringify(saleData));
      const savedSale = await Sale.create(saleData);
      console.log(`[Shopify] Sale saved successfully: ${savedSale._id}. rawOrderData saved: ${!!savedSale.rawOrderData}`);
      importedCount++;
    }

    return res.status(200).json({ message: `Se importaron ${importedCount} ventas.` });
  } catch (err: any) {
    console.error('[Shopify] importShopifySales error:', err?.message);
    return res.status(500).json({ error: 'Error al importar ventas de Shopify' });
  }
};


const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SCOPES = 'read_products,read_orders,read_customers'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'socialflow_secret';

export const initiateAuth = async (req: AuthRequest, res: Response) => {
  let { shop } = req.query;
  const storeId = req.user?.storeId;

  if (!shop || typeof shop !== 'string') return res.status(400).json({ error: 'Shop URL is required' });
  if (!storeId) return res.status(401).json({ error: 'No autorizado' });

  // Sanitize shop URL: remove protocol and paths
  shop = shop.replace(/^https?:\/\//, '').split('/')[0];

  const state = jwt.sign({ storeId }, JWT_SECRET, { expiresIn: '10m' });
  
  // Ensure BACKEND_URL starts with https://
  let baseUrl = BACKEND_URL;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  const redirectUri = `${baseUrl}/api/shopify/auth/callback`;
  
  console.log('[Shopify Debug] Auth URL construction:', { BACKEND_URL: process.env.BACKEND_URL, baseUrl, redirectUri, shop });
  
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

    await StoreConnections.findOneAndUpdate(
      { storeId: new mongoose.Types.ObjectId(payload.storeId) },
      {
        shopifyConnected: true,
        shopifyShopUrl: shop,
        shopifyAccessToken: tokenResponse.data.access_token,
      },
      { upsert: true }
    );

    return res.redirect(`${FRONTEND_URL}/settings?shopify=connected`);
  } catch (err: any) {
    console.error('[Shopify] handleCallback error:', err?.message);
    return res.redirect(`${FRONTEND_URL}/settings?shopify=error&reason=server_error`);
  }
};

/**
 * Handles incoming webhook events from Shopify.
 * Verifies the webhook signature using SHA256 HMAC and the app's API secret.
 */
// ... (rest of the file)
export const handleShopifyWebhook = async (req: Request, res: Response) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const topic = req.get('X-Shopify-Topic');
  const shop = req.get('X-Shopify-Shop-Domain');
  
  if (!hmac || !topic || !shop) {
    return res.status(401).json({ error: 'Faltan cabeceras de seguridad' });
  }

  // 1. Verify signature
  const body = JSON.stringify(req.body);
  const calculatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(body, 'utf8')
    .digest('base64');

  if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(calculatedHmac))) {
    // 2. Process event
    if (topic === 'products/update') {
      const productData = req.body;
      const variant = productData.variants[0]; // Assuming default variant

      console.log(`[Webhook-Shopify] Product updated on ${shop}: ${productData.id}`);

      // 3. Update stock in DB
      await Product.findOneAndUpdate(
        { sku: variant.sku || productData.id.toString() },
        { stock: variant.inventory_quantity }
      );
    }
    return res.status(200).send('Webhook processed');
  } else {
    return res.status(401).json({ error: 'Firma no válida' });
  }
};
export const getShopifyStatus = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) }).select('shopifyConnected');
    if (!connections) return res.status(404).json({ error: 'Conexiones no encontradas' });

    return res.status(200).json({ connected: connections.shopifyConnected });
  } catch (err: any) {
    console.error('[Shopify] getShopifyStatus error:', err?.message);
    return res.status(500).json({ error: 'Error al obtener estado' });
  }
};

export const disconnectShopify = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    await StoreConnections.findOneAndUpdate(
      { storeId: new mongoose.Types.ObjectId(storeId) },
      {
        shopifyConnected: false,
        shopifyShopUrl: '',
        shopifyAccessToken: '',
      }
    );

    return res.status(200).json({ message: 'Conexión con Shopify eliminada' });
  } catch (err: any) {
    console.error('[Shopify] disconnectShopify error:', err?.message);
    return res.status(500).json({ error: 'Error al desconectar' });
  }
};
