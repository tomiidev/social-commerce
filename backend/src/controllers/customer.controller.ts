import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Customer } from '../models/Customer';
import { Sale } from '../models/Sale';
import mongoose from 'mongoose';

export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const customers = await Customer.find({
      storeId: new mongoose.Types.ObjectId(storeId),
    }).sort({ updatedAt: -1 });

    return res.status(200).json(customers);
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
    const sales = await Sale.find({
      storeId: new mongoose.Types.ObjectId(storeId),
      customerId: customer._id,
    }).populate('productId').sort({ date: -1 });

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
