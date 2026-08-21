import { Schema, model, Document } from 'mongoose';

export interface IBillingSummary extends Document {
  storeId: Schema.Types.ObjectId;
  totalCharges: number;
  totalRefunds: number;
  balance: number;
  updatedAt: Date;
}

const BillingSummarySchema = new Schema<IBillingSummary>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
    totalCharges: { type: Number, default: 0 },
    totalRefunds: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const BillingSummary = model<IBillingSummary>('BillingSummary', BillingSummarySchema);
