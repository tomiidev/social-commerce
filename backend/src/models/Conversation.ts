import { Schema, model, Document } from 'mongoose';

export interface IConversation extends Document {
  storeId: Schema.Types.ObjectId;
  customerId: Schema.Types.ObjectId;
  channel: 'instagram' | 'facebook';
  status: 'open' | 'closed' | 'pending';
  unread: boolean;
  lastMessageText: string;
  lastMessageTime: Date;
  // Meta-specific fields
  externalConversationId?: string;   // Meta thread ID for message threading
  lastIncomingMessageTime?: Date;    // Last time the customer sent a message (24h window)
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    channel: { type: String, enum: ['instagram', 'facebook'], required: true },
    status: { type: String, enum: ['open', 'closed', 'pending'], default: 'open', index: true },
    unread: { type: Boolean, default: false, index: true },
    lastMessageText: { type: String, default: '' },
    lastMessageTime: { type: Date, default: Date.now },
    externalConversationId: { type: String, default: '' },
    lastIncomingMessageTime: { type: Date, default: null },
  },
  { timestamps: true }
);

ConversationSchema.index({ storeId: 1, lastMessageTime: -1 });

export const Conversation = model<IConversation>('Conversation', ConversationSchema);
