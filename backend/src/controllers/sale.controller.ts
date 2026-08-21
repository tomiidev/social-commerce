import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { StoreConnections } from '../models/StoreConnections';
import { MeliProvider } from '../services/MeliProvider';
import { callApi } from '../services/mercadolibre.service';
import axios from 'axios';
import mongoose from 'mongoose';

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
        const me: { id: string } = await callApi('/users/me', 'GET', connections.meliAccessToken);
        const orders = await meliProvider.getOrders(me.id);

        for (const order of orders) {
          await Sale.create({
            storeId,
            customerId: new mongoose.Types.ObjectId(), // Placeholder
            productId: new mongoose.Types.ObjectId(), // Placeholder
            amount: order.total_amount,
            date: new Date(order.date_created),
            channel: 'mercadolibre',
            status: order.status === 'paid' ? 'confirmed' : order.status === 'cancelled' ? 'cancelled' : 'pending',
            rawOrderData: order, // Store full order JSON
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
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { page, limit } = req.query;
    const currentPage = parseInt(page as string) || 1;
    const perPage = parseInt(limit as string) || 15;

    const query = { storeId: new mongoose.Types.ObjectId(storeId) };

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .populate('customerId')
      .populate('productId')
      .sort({ date: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const normalizedSales = await Promise.all(sales.map(async (sale) => {
      const saleObj = sale.toObject();
      
      // Default values
      let productName = 'Producto';
      let productPrice = saleObj.amount;
      let productImage = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=300';

      // 1. Attempt to fetch product details using the productId (ObjectId)
      if (saleObj.productId) {
        const product = await Product.findById(saleObj.productId);
        if (product) {
          productName = product.name || productName;
          productPrice = product.price || productPrice;
          productImage = product.image || productImage;
        }
      }
      
      // 2. Fallback to rawOrderData if channel is mercadolibre and productId lookup failed or wasn't available
      if (productName === 'Producto' && saleObj.channel === 'mercadolibre' && saleObj.rawOrderData?.order_items?.[0]) {
        const orderItem = saleObj.rawOrderData.order_items[0];
        productName = orderItem.item?.title || productName;
        productPrice = orderItem.unit_price || productPrice;
      }

      return {
        _id: saleObj._id,
        channel: saleObj.channel,
        status: saleObj.status,
        amount: saleObj.amount,
        date: saleObj.date,
        productId: {
          name: productName,
          price: productPrice,
          image: productImage
        },
        rawOrderData: saleObj.rawOrderData
      };
    }));

    return res.status(200).json({
      sales: normalizedSales,
      total,
      currentPage,
      pages: Math.ceil(total / perPage),
      perPage
    });
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

export const importSalesCsv = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });
    
    const { sales } = req.body; 
    
    if (!Array.isArray(sales)) return res.status(400).json({ error: 'Formato inválido' });

    let importedCount = 0;
    for (const s of sales) {
      // 1. Find or create Customer
      const email = s.rawOrderData?.customer?.email;
      let customer = null;
      if (email) {
        customer = await Customer.findOne({ storeId, email, channel: s.channel });
      }

      if (!customer) {
        customer = await Customer.create({
          storeId,
          name: 'Cliente Importado',
          username: email || 'imported_customer',
          email: email,
          channel: s.channel,
        });
      }

      // 2. Find Product
      const productName = s.rawOrderData?.line_items?.[0]?.name;
      let productId = null;
      if (productName) {
        const product = await Product.findOne({ storeId, name: productName });
        productId = product?._id;
      }

      // 3. Create Sale
      await Sale.create({
        storeId: new mongoose.Types.ObjectId(storeId),
        customerId: customer._id,
        productId: productId || null,
        amount: s.amount,
        date: new Date(s.date),
        channel: s.channel,
        status: s.status,
        rawOrderData: s.rawOrderData
      });
      importedCount++;
    }
    
    return res.status(200).json({ message: `Se importaron ${importedCount} ventas correctamente.` });
  } catch (error) {
    console.error('Error importing sales CSV:', error);
    return res.status(500).json({ error: 'Error al importar ventas' });
  }
};

export const updateSale = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { id } = req.params;
    const { status, amount, channel } = req.body;

    const sale = await Sale.findOneAndUpdate(
      { _id: id, storeId: new mongoose.Types.ObjectId(storeId) },
      { $set: { status, amount, channel } },
      { new: true }
    );

    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    return res.status(200).json(sale);
  } catch (error: any) {
    console.error('Error updating sale:', error);
    return res.status(500).json({ error: 'Error al actualizar venta' });
  }
};
