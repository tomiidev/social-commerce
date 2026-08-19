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
import { StoreConnections } from '../models/StoreConnections';
import { MeliQuestion } from '../models/MeliQuestion';
import { Product } from '../models/Product';
import { Event } from '../models/Event';
import { getOAuthUrl, exchangeCodeForToken } from '../services/mercadolibre.service';
import { MeliProvider } from '../services/MeliProvider';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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
