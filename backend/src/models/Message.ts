import { Schema, model, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: Schema.Types.ObjectId;
  sender: 'customer' | 'user' | 'system';
  text: string;
  mediaUrl?: string;
  aiSuggested?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: String, enum: ['customer', 'user', 'system'], required: true },
    text: { type: String, required: true },
    mediaUrl: { type: String, default: '' },
    aiSuggested: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = model<IMessage>('Message', MessageSchema);
