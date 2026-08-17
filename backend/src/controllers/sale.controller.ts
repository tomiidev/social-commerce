import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import mongoose from 'mongoose';

export const getSales = async (req: AuthRequest, res: Response) => {
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
