import { Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { BillingTransaction } from '../models/BillingTransaction';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export const analyzeBilling = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'Unauthorized' });

    const transactions = await BillingTransaction.find({ storeId: new mongoose.Types.ObjectId(storeId) });
    
    const analysis = await GeminiService.analyzeBillingData(storeId, transactions);
    res.json({ analysis });
  } catch (err: any) {
    console.error('[Billing] analyzeBilling error:', err?.message);
    res.status(500).json({ error: 'Error al analizar facturación' });
  }
};

export const reconcileBilling = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'Unauthorized' });

    const { externalData } = req.body;
    const dbTransactions = await BillingTransaction.find({ storeId: new mongoose.Types.ObjectId(storeId) });
    
    const reconciliation = await GeminiService.reconcileBillingData(storeId, dbTransactions, externalData);
    res.json({ reconciliation });
  } catch (err: any) {
    console.error('[Billing] reconcileBilling error:', err?.message);
    res.status(500).json({ error: 'Error al conciliar facturación' });
  }
};
