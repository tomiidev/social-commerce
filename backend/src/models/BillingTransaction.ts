import { Schema, model, Document } from 'mongoose';

export interface IBillingTransaction extends Document {
  storeId: Schema.Types.ObjectId;
  saleId?: Schema.Types.ObjectId;
  date: Date;
  description: string;
  amount: number;
  type: 'charge' | 'refund';
  category?: string; // New field
  invoiceNumber: string;
  chargeNumber: string;
  saleNumber: string;
  publicationTitle: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillingTransactionSchema = new Schema<IBillingTransaction>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', index: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['charge', 'refund'], required: true },
    category: { type: String, index: true }, // Added index
    invoiceNumber: { type: String },
    chargeNumber: { type: String },
    saleNumber: { type: String },
    publicationTitle: { type: String },
  },
  { timestamps: true }
);

BillingTransactionSchema.index({ storeId: 1, date: -1 });

export const BillingTransaction = model<IBillingTransaction>('BillingTransaction', BillingTransactionSchema);
