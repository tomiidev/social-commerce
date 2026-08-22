import { Sale } from '../models/Sale';
import { Product } from '../models/Product';
import { BillingTransaction } from '../models/BillingTransaction';
import mongoose from 'mongoose';

export class PricingService {
  static async getPricingRecommendations(storeId: string) {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // 1. Get sales velocity per product
    const salesVelocity = await Sale.aggregate([
      { $match: { storeId: storeObjectId, status: 'confirmed' } },
      { $group: { _id: '$productId', totalSold: { $sum: 1 } } }
    ]);

    // 2. Get product details (cost/price)
    const products = await Product.find({ storeId: storeObjectId });

    // 3. Simple mapping for Gemini context
    const productsData = products.map(p => {
        const velocity = salesVelocity.find(v => v._id.equals(p._id))?.totalSold || 0;
        return {
            name: p.name,
            price: p.price,
            cost: p.stock > 0 ? (p.price * 0.7) : 0, // Placeholder cost logic
            salesVolume: velocity
        };
    });

    return productsData;
  }
}
