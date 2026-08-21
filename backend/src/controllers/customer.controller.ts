import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Customer } from '../models/Customer';
import { Sale } from '../models/Sale';
import mongoose from 'mongoose';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const { page, limit } = req.query;
    const currentPage = parseInt(page as string) || 1;
    const perPage = parseInt(limit as string) || 15;

    const query = { storeId: new mongoose.Types.ObjectId(storeId) };

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .sort({ updatedAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    return res.status(200).json({
      customers,
      total,
      currentPage,
      pages: Math.ceil(total / perPage),
      perPage
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const customer = await Customer.findOne({
      _id: id,
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Get customer's sales
    console.log('DEBUG: Fetching sales for storeId:', storeId, 'and customerId:', customer._id);
    
    // Debug: List all sales in this store to verify linkage
    const allStoreSales = await Sale.find({ storeId: new mongoose.Types.ObjectId(storeId) });
    console.log('DEBUG: Total sales in store:', allStoreSales.length);
    console.log('DEBUG: Sales customerIds:', allStoreSales.map(s => s.customerId));

    const sales = await Sale.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      customerId: customer._id,
    }).populate('productId').sort({ date: -1 });

    console.log('DEBUG: Found sales for customer:', sales.length);

    return res.status(200).json({
      customer,
      sales,
    });
  } catch (error: any) {
    console.error('Error fetching customer details:', error);
    return res.status(500).json({ error: 'Error al obtener detalle de cliente' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;
    const { tags, notes, name, username, city } = req.body;

    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const customer = await Customer.findOneAndUpdate(
      { _id: id, storeId: new mongoose.Types.ObjectId(storeId) },
      { tags, notes, name, username, city },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.status(200).json(customer);
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};
