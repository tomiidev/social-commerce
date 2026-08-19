import { Schema, model, Document } from 'mongoose';

export interface IStore extends Document {
  name: string;
  plan: string;
  logo?: string;
  // AI Token Usage
  aiTokensUsed: number;
  aiTokenLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    plan: { type: String, default: 'Plan Pro' },
    logo: { type: String, default: '' },
    // AI Token Usage
    aiTokensUsed: { type: Number, default: 0 },
    aiTokenLimit: { type: Number, default: 500000 },
  },
  { timestamps: true }
);

export const Store = model<IStore>('Store', StoreSchema);
