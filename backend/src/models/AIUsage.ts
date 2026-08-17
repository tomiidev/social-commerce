import { Schema, model, Types } from 'mongoose';

export interface IAIUsage {
  storeId: Types.ObjectId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const AIUsageSchema = new Schema<IAIUsage>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    model: { type: String, required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 }, // Cost in USD
  },
  { timestamps: true }
);

export const AIUsage = model<IAIUsage>('AIUsage', AIUsageSchema);
