import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  storeId: Schema.Types.ObjectId;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    role: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
