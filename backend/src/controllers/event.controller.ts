import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Event } from '../models/Event';
import mongoose from 'mongoose';

export const getRecentEvents = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'No autorizado' });

    const events = await Event.find({ storeId: new mongoose.Types.ObjectId(storeId) })
      .sort({ createdAt: -1 })
      .limit(4);

    return res.status(200).json(events);
  } catch (error: any) {
    console.error('Error fetching recent events:', error);
    return res.status(500).json({ error: 'Error al obtener eventos' });
  }
};
