import { Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { BillingTransaction } from '../models/BillingTransaction';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { MarginService } from '../services/margin.service';
import { TimeSeriesService } from '../services/timeseries.service';
import { PricingService } from '../services/pricing.service';

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

export const getMarginAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'Unauthorized' });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const marginData = await MarginService.calculateMargins(storeId, startDate, endDate);
    res.json(marginData);
  } catch (err: any) {
    console.error('[Billing] getMarginAnalysis error:', err?.message);
    res.status(500).json({ error: 'Error al calcular márgenes' });
  }
};

export const getCashFlowForecast = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'Unauthorized' });

    const series = await TimeSeriesService.getMonthlyFinancialSeries(storeId);
    
    const forecast = await GeminiService.forecastCashFlow(storeId, series);
    res.json({ forecast });
  } catch (err: any) {
    console.error('[Billing] getCashFlowForecast error:', err?.message);
    res.status(500).json({ error: 'Error al generar pronóstico' });
  }
};

export const getPricingRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) return res.status(401).json({ error: 'Unauthorized' });

    const productsData = await PricingService.getPricingRecommendations(storeId);
    const recommendations = await GeminiService.recommendPricingStrategies(storeId, productsData);
    
    res.json({ recommendations });
  } catch (err: any) {
    console.error('[Billing] getPricingRecommendations error:', err?.message);
    res.status(500).json({ error: 'Error al generar recomendaciones' });
  }
};
