import { Schema, model, Document } from 'mongoose';

export interface IMeliQuestion extends Document {
  storeId: Schema.Types.ObjectId;
  questionId: string;
  itemId: string;
  text: string;
  status: string;
  createdAt: Date;
}

const MeliQuestionSchema = new Schema<IMeliQuestion>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    questionId: { type: String, required: true, unique: true },
    itemId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    status: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const MeliQuestion = model<IMeliQuestion>('MeliQuestion', MeliQuestionSchema);
