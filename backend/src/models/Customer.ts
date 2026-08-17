import { Schema, model, Document } from 'mongoose';

export interface ICustomer extends Document {
  storeId: Schema.Types.ObjectId;
  name: string;
  username: string;
  avatar: string;
  channel: 'instagram' | 'facebook';
  // Meta external ID: IGSID (Instagram) or PSID (Facebook Messenger)
  externalId?: string;
  lastInteraction: Date;
  conversationsCount: number;
  purchasesCount: number;
  tags: string[];
  notes: string;
  city: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    channel: { type: String, enum: ['instagram', 'facebook'], required: true },
    externalId: { type: String, default: '', index: true },
    lastInteraction: { type: Date, default: Date.now },
    conversationsCount: { type: Number, default: 0 },
    purchasesCount: { type: Number, default: 0 },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    city: { type: String, default: '' },
  },
  { timestamps: true }
);

CustomerSchema.index({ storeId: 1, name: 1 });
CustomerSchema.index({ storeId: 1, username: 1 });

export const Customer = model<ICustomer>('Customer', CustomerSchema);
