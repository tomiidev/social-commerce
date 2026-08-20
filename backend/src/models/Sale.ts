import { Schema, model, Document } from 'mongoose';

export interface ISale extends Document {
  storeId: Schema.Types.ObjectId;
  customerId: Schema.Types.ObjectId;
  productId: Schema.Types.ObjectId;
  amount: number;
  date: Date;
  channel: 'instagram' | 'facebook' | 'mercadolibre' | 'shopify';
  status: 'pending' | 'confirmed' | 'cancelled';
  rawOrderData?: Record<string, any>; // Store complete raw API response
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    channel: { type: String, enum: ['instagram', 'facebook', 'mercadolibre', 'shopify'], required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending', index: true },
    rawOrderData: { type: Schema.Types.Mixed }, // Use Mixed for flexible JSON structure
  },
  { timestamps: true }
);

SaleSchema.index({ storeId: 1, date: -1 });

export const Sale = model<ISale>('Sale', SaleSchema);
