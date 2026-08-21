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
import { MeliReport } from '../models/MeliReport';
import { BillingTransaction } from '../models/BillingTransaction';
import { BillingSummary } from '../models/BillingSummary';

// ---------------------------------------------------------------------------
// GET /api/mercadolibre/reports
// ---------------------------------------------------------------------------
export const getMeliBillingDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    // Fetch imported billing transactions from DB
    const transactions = await BillingTransaction.find({ storeId: new mongoose.Types.ObjectId(storeId) })
      .sort({ date: -1 });

    // Calculate summary statistics
    let totalCharges = 0;
    let totalRefunds = 0;

    transactions.forEach(t => {
      if (t.type === 'charge') {
        totalCharges += t.amount;
      } else if (t.type === 'refund') {
        totalRefunds += Math.abs(t.amount); 
      }
    });

    return res.status(200).json({
      transactions,
      summary: {
        totalCharges,
        totalRefunds,
        balance: totalCharges - totalRefunds
      }
    });
  } catch (err: any) {
    console.error('[MercadoLibre] getMeliBillingDocuments error:', err?.message);
    return res.status(500).json({ error: 'Error al obtener detalles de facturación' });
  }
};

// ---------------------------------------------------------------------------
// GET /api/mercadolibre/reports
// ---------------------------------------------------------------------------
export const getMeliReports = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await MeliReport.countDocuments({ storeId: new mongoose.Types.ObjectId(storeId) });
    const reports = await MeliReport.find({ storeId: new mongoose.Types.ObjectId(storeId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });

    if (connections && connections.meliAccessToken) {
      const meliProvider = new MeliProvider(
      connections.meliAccessToken,
      connections.meliRefreshToken || null,
      connections.storeId as any
    );

      for (const report of reports) {
        if (['PENDING', 'PROCESSING'].includes(report.status)) {
          try {
            const statusData = await meliProvider.getBillingReportStatus(report.reportId);
            if (statusData.status !== report.status) {
              report.status = statusData.status;
              if (statusData.status === 'READY') {
                report.downloadUrl = statusData.download_url;
              }
              await report.save();
            }
          } catch (e) {
            console.error(`[MercadoLibre] Error updating report ${report.reportId} status`);
          }
        }
      }
    }

    return res.status(200).json({ reports, total, page, limit });
  } catch (err: any) {
    console.error('[MercadoLibre] getMeliReports error:', err?.message);
    return res.status(500).json({ error: 'Error al obtener reportes' });
  }
};

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

    const meliProvider = new MeliProvider(
      connections.meliAccessToken,
      connections.meliRefreshToken || null,
      connections.storeId as any
    );
    const me: { id: string } = await callApi('/users/me', 'GET', connections.meliAccessToken);
    
    const orders = await meliProvider.getOrders(me.id);
    console.log(`[MercadoLibre] Found ${orders.length} orders to process.`);

    let importedCount = 0;
    for (const order of orders) {
      console.log(`[MercadoLibre] Processing order ${order.id} with ${order.order_items.length} items`);
      
      // Find or create customer
      const buyerId = order.buyer.id.toString();
      let customer = await Customer.findOne({ storeId, externalId: buyerId, channel: 'mercadolibre' });
      
      if (!customer) {
        console.log(`[MercadoLibre] Creating new customer ${buyerId}`);
        customer = await Customer.create({
          storeId,
          name: order.buyer.nickname,
          username: order.buyer.nickname,
          externalId: buyerId,
          channel: 'mercadolibre',
        });
      }

      // Process each item in the order
      for (const orderItem of order.order_items) {
        const itemId = orderItem.item.id;
        console.log(`[MercadoLibre] Looking for product ${itemId}`);
        const product = await Product.findOne({ storeId, meliItemId: itemId });
        
        if (product) {
          console.log(`[MercadoLibre] Found product ${product._id}, creating sale.`);
          
          // Determine status
          let saleStatus: 'pending' | 'confirmed' | 'cancelled' = 'pending';
          if (order.status === 'cancelled') {
              saleStatus = 'cancelled';
          } else if (order.status === 'paid' || order.status === 'confirmed') {
              saleStatus = 'confirmed';
          }

          // Map item to Sale
          await Sale.create({
            storeId,
            customerId: customer._id,
            productId: product._id,
            amount: orderItem.unit_price * orderItem.quantity,
            date: new Date(order.date_created),
            channel: 'mercadolibre',
            status: saleStatus,
            rawOrderData: order, // Keep full order reference
          });
          
          customer.purchasesCount += 1;
          importedCount++;
        } else {
          console.warn(`[MercadoLibre] Product ${itemId} not found for order ${order.id}`);
        }
      }
      await customer.save();
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

    const meliProvider = new MeliProvider(
      connections.meliAccessToken,
      connections.meliRefreshToken || null,
      connections.storeId as any
    );
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

    const meliProvider = new MeliProvider(
      connections.meliAccessToken,
      connections.meliRefreshToken || null,
      connections.storeId as any
    );
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

export const importBilling = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { rows } = req.body;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });
    if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: 'Datos inválidos' });

    for (const row of rows) {
      await BillingTransaction.create({
        storeId,
        date: new Date(row.date),
        description: row.description,
        amount: row.amount,
        type: row.type,
        invoiceNumber: row.invoiceNumber,
        chargeNumber: row.chargeNumber,
        saleNumber: row.saleNumber,
        publicationTitle: row.publicationTitle,
      });
    }

    // Update or create summary
    console.log('[DEBUG] Rows to import:', rows);
    
    // Calculate based on explicit type, not just amount sign
    const totalCharges = rows.filter((r: any) => r.type === 'charge').reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
    const totalRefunds = rows.filter((r: any) => r.type === 'refund').reduce((sum: number, r: any) => sum + Math.abs(parseFloat(r.amount) || 0), 0);
    const netChange = totalCharges - totalRefunds;

    console.log(`[DEBUG] Updating summary for store ${storeId}: Charges=${totalCharges}, Refunds=${totalRefunds}, Net=${netChange}`);

    const result = await BillingSummary.findOneAndUpdate(
        { storeId: new mongoose.Types.ObjectId(storeId) },
        { 
            $inc: { 
                totalCharges: totalCharges, 
                totalRefunds: totalRefunds,
                balance: netChange
            } 
        },
        { upsert: true, new: true }
    );
    console.log('[DEBUG] Summary update result:', result);

    return res.status(200).json({ message: 'Facturación importada correctamente' });
  } catch (err: any) {
    console.error('[MercadoLibre] importBilling error:', err?.message);
    return res.status(500).json({ error: 'Error al importar facturación' });
  }
};

// Helper to recalculate summary from transactions
const recalculateSummary = async (storeId: mongoose.Types.ObjectId) => {
    const transactions = await BillingTransaction.find({ storeId });
    let totalCharges = 0;
    let totalRefunds = 0;

    transactions.forEach(t => {
      if (t.type === 'charge') {
        totalCharges += t.amount;
      } else if (t.type === 'refund') {
        totalRefunds += Math.abs(t.amount); 
      }
    });

    await BillingSummary.findOneAndUpdate(
        { storeId },
        { 
            totalCharges: totalCharges, 
            totalRefunds: totalRefunds,
            balance: totalCharges - totalRefunds
        },
        { upsert: true, new: true }
    );
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    await BillingTransaction.findOneAndDelete({ _id: id, storeId: new mongoose.Types.ObjectId(storeId) });
    
    await recalculateSummary(new mongoose.Types.ObjectId(storeId));

    return res.status(200).json({ message: 'Transacción eliminada correctamente' });
  } catch (err: any) {
    console.error('[MercadoLibre] deleteTransaction error:', err?.message);
    return res.status(500).json({ error: 'Error al eliminar transacción' });
  }
};

export const deleteAllTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    await BillingTransaction.deleteMany({ storeId: new mongoose.Types.ObjectId(storeId) });
    
    await BillingSummary.findOneAndUpdate(
        { storeId: new mongoose.Types.ObjectId(storeId) },
        { totalCharges: 0, totalRefunds: 0, balance: 0 },
        { upsert: true }
    );

    return res.status(200).json({ message: 'Todas las transacciones eliminadas' });
  } catch (err: any) {
    console.error('[MercadoLibre] deleteAllTransactions error:', err?.message);
    return res.status(500).json({ error: 'Error al eliminar transacciones' });
  }
}

