import { Schema, model, Document } from 'mongoose';

export interface IEvent extends Document {
  storeId: Schema.Types.ObjectId;
  type: 'question' | 'conversation' | 'sale';
  text: string;
  channel: 'instagram' | 'facebook' | 'mercadolibre' | 'system';
  referenceId?: Schema.Types.ObjectId; // Add this
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    type: { type: String, enum: ['question', 'conversation', 'sale'], required: true },
    text: { type: String, required: true },
    channel: { type: String, enum: ['instagram', 'facebook', 'mercadolibre', 'system'], required: true },
    referenceId: { type: Schema.Types.ObjectId, required: false }, // Add this
  },
  { timestamps: true }
);

EventSchema.index({ storeId: 1, createdAt: -1 });

export const Event = model<IEvent>('Event', EventSchema);
