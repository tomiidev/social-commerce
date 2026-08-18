import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  storeId: Schema.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  sizes: string[];
  colors: string[];
  image: string;
  queriesCount: number;
  channels: ('instagram' | 'facebook' | 'mercadolibre' | 'import')[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    sku: { type: String, default: '' },
    sizes: [{ type: String }],
    colors: [{ type: String }],
    image: { type: String, default: '' },
    queriesCount: { type: Number, default: 0 },
    channels: [{ type: String, enum: ['instagram', 'facebook', 'mercadolibre', 'import'] }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ storeId: 1, name: 1 });

export const Product = model<IProduct>('Product', ProductSchema);
