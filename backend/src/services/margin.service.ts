import { BillingTransaction } from '../models/BillingTransaction';
import { Sale } from '../models/Sale';
import mongoose from 'mongoose';

export class MarginService {
  static async calculateMargins(storeId: string, startDate: Date, endDate: Date) {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Fetch sales and billing for the period
    const [sales, billing] = await Promise.all([
      Sale.find({
        storeId: storeObjectId,
        date: { $gte: startDate, $lte: endDate },
        status: 'confirmed'
      }).populate('productId'),
      BillingTransaction.find({
        storeId: storeObjectId,
        date: { $gte: startDate, $lte: endDate }
      })
    ]);

    // Grouping and calculation logic (simplified for MVP)
    let totalRevenue = 0;
    let totalCosts = 0;

    sales.forEach(sale => {
      totalRevenue += sale.amount;
    });

    billing.forEach(trans => {
      if (trans.type === 'charge') totalCosts += trans.amount;
      else totalCosts -= trans.amount;
    });

    const netProfit = totalRevenue - totalCosts;

    return {
      period: { start: startDate, end: endDate },
      totalRevenue,
      totalCosts,
      netProfit,
      marginPercentage: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    };
  }
}
