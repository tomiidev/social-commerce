import { Schema, model, Document } from 'mongoose';

export interface IAIMessage {
  sender: 'user' | 'assistant';
  text: string;
  createdAt: Date;
}

export interface IAIConversation extends Document {
  storeId: Schema.Types.ObjectId;
  messages: IAIMessage[];
  title: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIMessageSchema = new Schema<IAIMessage>({
  sender: { type: String, enum: ['user', 'assistant'], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const AIConversationSchema = new Schema<IAIConversation>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    messages: [AIMessageSchema],
    title: { type: String, default: 'Nueva Conversación' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AIConversation = model<IAIConversation>('AIConversation', AIConversationSchema);
