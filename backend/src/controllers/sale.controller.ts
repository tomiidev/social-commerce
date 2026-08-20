import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { StoreConnections } from '../models/StoreConnections';
import { MeliProvider } from '../services/MeliProvider';
import axios from 'axios';
import mongoose from 'mongoose';

// ... existing imports ...

// ---------------------------------------------------------------------------
// POST /api/sales/import-all
// ---------------------------------------------------------------------------

export const importAllSales = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const connections = await StoreConnections.findOne({ storeId: new mongoose.Types.ObjectId(storeId) });
    if (!connections) {
      return res.status(400).json({ error: 'No se encontraron conexiones para la tienda' });
    }

    let totalImported = 0;

    // 1. Import ML Sales
    if (connections.meliConnected && connections.meliAccessToken) {
      try {
        const meliProvider = new MeliProvider(connections.meliAccessToken);
        const me: { id: string } = await (meliProvider as any).callApi('/users/me', 'GET', connections.meliAccessToken);
        const orders = await meliProvider.getOrders(me.id);

        for (const order of orders) {
          await Sale.create({
            storeId,
            customerId: new mongoose.Types.ObjectId(), // Placeholder
            productId: new mongoose.Types.ObjectId(), // Placeholder
            amount: order.total_amount,
            date: new Date(order.date_created),
            channel: 'mercadolibre',
            status: order.status === 'paid' ? 'confirmed' : 'pending',
          });
          totalImported++;
        }
      } catch (err) {
        console.error('Error importing ML sales:', err);
      }
    }

    // 2. Import Shopify Sales
    if (connections.shopifyConnected && connections.shopifyAccessToken && connections.shopifyShopUrl) {
      try {
        const client = axios.create({
          baseURL: `https://${connections.shopifyShopUrl}/admin/api/2024-01`,
          headers: {
            'X-Shopify-Access-Token': connections.shopifyAccessToken,
            'Content-Type': 'application/json',
          },
        });

        const response = await client.get('/orders.json?status=any');
        const orders = response.data.orders;

        for (const order of orders) {
          await Sale.create({
            storeId,
            customerId: new mongoose.Types.ObjectId(), // Placeholder
            productId: new mongoose.Types.ObjectId(), // Placeholder
            amount: parseFloat(order.total_price),
            date: new Date(order.created_at),
            channel: 'shopify',
            status: order.financial_status === 'paid' ? 'confirmed' : 'pending',
          });
          totalImported++;
        }
      } catch (err) {
        console.error('Error importing Shopify sales:', err);
      }
    }

    return res.status(200).json({ message: `Se importaron ${totalImported} ventas en total.` });
  } catch (error: any) {
    console.error('Error importing all sales:', error);
    return res.status(500).json({ error: 'Error al importar ventas' });
  }
};


// ... existing imports ...

// ---------------------------------------------------------------------------
// GET /api/sales/summary
// ---------------------------------------------------------------------------

export const getSalesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const salesSummary = await Sale.aggregate([
      { $match: { storeId: storeObjectId, status: 'confirmed' } },
      { $group: { _id: '$channel', total: { $sum: '$amount' } } }
    ]);

    const salesBreakdown = {
      instagram: 0,
      facebook: 0,
      mercadolibre: 0,
      shopify: 0
    };
    
    salesSummary.forEach(item => {
      if (item._id && salesBreakdown.hasOwnProperty(item._id)) {
        salesBreakdown[item._id as keyof typeof salesBreakdown] = item.total;
      }
    });

    const totalIncome = Object.values(salesBreakdown).reduce((a, b) => a + b, 0);

    return res.status(200).json({ totalIncome, salesBreakdown });
  } catch (error: any) {
    console.error('Error fetching sales summary:', error);
    return res.status(500).json({ error: 'Error al obtener resumen de ventas' });
  }
};

export const getSales = async (req: AuthRequest, res: Response) => {
// ...
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const sales = await Sale.find({
      storeId: new mongoose.Types.ObjectId(storeId),
    })
      .populate('customerId')
      .populate('productId')
      .sort({ date: -1 });

    return res.status(200).json(sales);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { customerId, productId, amount, channel, status } = req.body;

    if (!customerId || !productId || !amount || !channel) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verify customer exists
    const customer = await Customer.findOne({
      _id: customerId,
      storeId: new mongoose.Types.ObjectId(storeId),
    });
    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Verify product exists
    const product = await Product.findOne({
      _id: productId,
      storeId: new mongoose.Types.ObjectId(storeId),
    });
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Create the Sale
    const sale = await Sale.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      customerId: new mongoose.Types.ObjectId(customerId),
      productId: new mongoose.Types.ObjectId(productId),
      amount,
      channel,
      status: status || 'pending',
      date: new Date(),
    });

    // Update customer's purchase count if confirmed
    if (status === 'confirmed') {
      customer.purchasesCount += 1;
      await customer.save();
    }

    const populatedSale = await sale.populate(['customerId', 'productId']);
    return res.status(201).json(populatedSale);
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return res.status(500).json({ error: 'Error al registrar venta' });
  }
};
