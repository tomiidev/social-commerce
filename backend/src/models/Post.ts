import { Schema, model, Document } from 'mongoose';

export interface IPost extends Document {
  storeId: Schema.Types.ObjectId;
  productId?: Schema.Types.ObjectId;
  image: string;
  caption: string;
  date: Date;
  channel: 'instagram' | 'facebook';
  commentsCount: number;
  queriesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    image: { type: String, required: true },
    caption: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    channel: { type: String, enum: ['instagram', 'facebook'], required: true },
    commentsCount: { type: Number, default: 0 },
    queriesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PostSchema.index({ storeId: 1, channel: 1 });

export const Post = model<IPost>('Post', PostSchema);
