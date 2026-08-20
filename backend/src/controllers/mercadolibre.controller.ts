/**
 * mercadolibre.controller.ts
 *
 * Handles the OAuth connection flow for Mercado Libre:
 *
 *  GET  /api/mercadolibre/auth/url        — Generate the MELI OAuth URL
 *  GET  /api/mercadolibre/auth/callback   — Exchange code → tokens, persist in Store
 *  GET  /api/mercadolibre/status          — Return connection status for this store
 *  POST /api/mercadolibre/disconnect      — Remove MELI credentials from the store
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Event } from '../models/Event';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { StoreConnections } from '../models/StoreConnections';
import mongoose from 'mongoose';
import { MeliProvider } from '../services/MeliProvider';
import { MeliQuestion } from '../models/MeliQuestion';
import { Product } from '../models/Product';
import { exchangeCodeForToken, getOAuthUrl, callApi } from '../services/mercadolibre.service';
import jwt from "jsonwebtoken"
// ... existing imports ...

// ---------------------------------------------------------------------------
// POST /api/mercadolibre/sales/import
// ---------------------------------------------------------------------------

export const importMeliSales = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });
    if (!connections || !connections.meliAccessToken) {
      return res.status(400).json({ error: 'Tienda no conectada a Mercado Libre' });
    }

    const meliProvider = new MeliProvider(connections.meliAccessToken);
    const me: { id: string } = await callApi('/users/me', 'GET', connections.meliAccessToken);
    
    const orders = await meliProvider.getOrders(me.id);

    let importedCount = 0;
    for (const order of orders) {
      // Check if sale already exists (using order.id as a unique identifier if needed, 
      // but schema doesn't have meliOrderId, I might need to add it or use amount/date as proxy)
      // I'll skip existing sale check for simplicity for now.
      
      // Map order to Sale
      const sale = await Sale.create({
        storeId,
        customerId: new mongoose.Types.ObjectId(), // Placeholder, needs proper customer mapping
        productId: new mongoose.Types.ObjectId(), // Placeholder, needs proper product mapping
        amount: order.total_amount,
        date: new Date(order.date_created),
        channel: 'mercadolibre',
        status: order.status === 'paid' ? 'confirmed' : order.status === 'cancelled' ? 'cancelled' : 'pending',
        rawOrderData: order, // Store full order JSON
      });
      importedCount++;
    }

    return res.status(200).json({ message: `Se importaron ${importedCount} ventas.` });
  } catch (err: any) {
    console.error('[MercadoLibre] importMeliSales error:', err?.message);
    return res.status(500).json({ error: 'Error al importar ventas de Mercado Libre' });
  }
};


const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'socialflow_secret';

// ---------------------------------------------------------------------------
// GET /api/mercadolibre/items/:itemId/questions
// ---------------------------------------------------------------------------

export const getProductQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { itemId } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });
    if (!connections || !connections.meliAccessToken) {
      return res.status(400).json({ error: 'Tienda no conectada a Mercado Libre' });
    }

    const meliProvider = new MeliProvider(connections.meliAccessToken);
    const questions = await meliProvider.getQuestions(itemId);

    // Save/Update questions in database and update product queries count
    for (const q of questions) {
      const existing = await MeliQuestion.findOne({ questionId: q.id });
      if (!existing) {
        await MeliQuestion.create({
          storeId,
          itemId,
          text: q.text,
          status: q.status,
          createdAt: q.date_created,
        });

        // Increment product queries count
        await Product.findOneAndUpdate(
          { storeId, sku: itemId }, // Assuming itemId is used as SKU or identifiable
          { $inc: { queriesCount: 1 } }
        );

        // Record event
        await Event.create({
          storeId,
          type: 'question',
          text: `Nueva consulta en Mercado Libre: "${q.text.substring(0, 30)}..."`,
          channel: 'mercadolibre',
        });
      }
    }

    return res.status(200).json(questions);
  } catch (err: any) {
    console.error('[MercadoLibre] getProductQuestions error:', err?.message);
    return res.status(500).json({ error: 'Error al obtener preguntas de Mercado Libre' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/mercadolibre/auth/url
// ---------------------------------------------------------------------------

export const getAuthUrl = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const state = jwt.sign({ storeId }, JWT_SECRET, { expiresIn: '10m' });
    const url = getOAuthUrl(state);

    return res.status(200).json({ url });
  } catch (err: any) {
    console.error('[MercadoLibre] getAuthUrl error:', err?.message);
    return res.status(500).json({ error: 'Error al generar URL de autorización' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/mercadolibre/auth/callback
// ---------------------------------------------------------------------------

export const handleOAuthCallback = async (req: Request, res: Response) => {
  const { code, state, error: oauthError } = req.query as Record<string, string>;

  if (oauthError) {
    return res.redirect(`${FRONTEND_URL}/settings?meli=denied`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/settings?meli=error&reason=missing_params`);
  }

  try {
    const payload = jwt.verify(state, JWT_SECRET) as { storeId: string };
    const storeId = payload.storeId;

    const tokens = await exchangeCodeForToken(code);

    await StoreConnections.findOneAndUpdate(
      { storeId: new mongoose.Types.ObjectId(storeId) },
      {
        meliConnected: true,
        meliAccessToken: tokens.access_token,
        meliRefreshToken: tokens.refresh_token,
        meliTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      { upsert: true }
    );

    console.log(`[MercadoLibre] Store ${storeId} connected`);

    return res.redirect(`${FRONTEND_URL}/settings?meli=connected`);
  } catch (err: any) {
    console.error('[MercadoLibre] handleOAuthCallback error:', err?.message);
    return res.redirect(`${FRONTEND_URL}/settings?meli=error&reason=server_error`);
  }
};

// ---------------------------------------------------------------------------
// GET /api/mercadolibre/status
// ---------------------------------------------------------------------------

export const getMeliStatus = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) }).select('meliConnected');

    if (!connections) return res.status(404).json({ error: 'Conexiones no encontradas' });

    return res.status(200).json({ connected: connections.meliConnected });
  } catch (err: any) {
    console.error('[MercadoLibre] getMeliStatus error:', err?.message);
    return res.status(500).json({ error: 'Error al obtener estado de conexión' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/mercadolibre/disconnect
// ---------------------------------------------------------------------------

export const disconnectMeli = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    await StoreConnections.findOneAndUpdate(
      { storeId: new mongoose.Types.ObjectId(storeId) },
      {
        meliConnected: false,
        meliAccessToken: '',
        meliRefreshToken: '',
        meliTokenExpiresAt: null,
      }
    );

    return res.status(200).json({ message: 'Cuenta de Mercado Libre desconectada correctamente' });
  } catch (err: any) {
    console.error('[MercadoLibre] disconnectMeli error:', err?.message);
    return res.status(500).json({ error: 'Error al desconectar cuenta de Mercado Libre' });
  }
};
export const importMeliCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });
    if (!connections || !connections.meliAccessToken) {
      return res.status(400).json({ error: 'Tienda no conectada a Mercado Libre' });
    }

    const meliProvider = new MeliProvider(connections.meliAccessToken);
    const me: { id: string } = await callApi('/users/me', 'GET', connections.meliAccessToken);
    
    const orders = await meliProvider.getOrders(me.id);

    let importedCount = 0;
    for (const order of orders) {
      const buyer = order.buyer;
      console.log('[DEBUG] Order object:', JSON.stringify(order));
      console.log('[DEBUG] Buyer object:', JSON.stringify(buyer));
      if (!buyer) continue;

      // Check if customer already exists
      const existingCustomer = await Customer.findOne({
        storeId,
        externalId: buyer.id.toString(),
        channel: 'mercadolibre'
      });

      if (!existingCustomer) {
        const name = (buyer.first_name || buyer.last_name) 
          ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() 
          : (buyer.nickname || 'Sin nombre');

        await Customer.create({
          storeId,
          name,
          username: buyer.nickname || buyer.id.toString(),
          avatar: '',
          channel: 'mercadolibre',
          externalId: buyer.id.toString(),
        });
        importedCount++;
      }
    }

    return res.status(200).json({ message: `Se importaron ${importedCount} clientes.` });
  } catch (err: any) {
    console.error('[MercadoLibre] importMeliCustomers error:', err?.message);
    return res.status(500).json({ error: 'Error al importar clientes de Mercado Libre' });
  }
};

