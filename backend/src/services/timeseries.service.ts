import { Sale } from '../models/Sale';
import { BillingTransaction } from '../models/BillingTransaction';
import mongoose from 'mongoose';

export class TimeSeriesService {
  static async getMonthlyFinancialSeries(storeId: string) {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Aggregate Sales by month
    const salesSeries = await Sale.aggregate([
      { $match: { storeId: storeObjectId, status: 'confirmed' } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          totalRevenue: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Aggregate Costs by month
    const costsSeries = await BillingTransaction.aggregate([
      { $match: { storeId: storeObjectId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          totalCosts: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    return { salesSeries, costsSeries };
  }
}
