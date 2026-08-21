import mongoose, { Schema, Document } from 'mongoose';

export interface IMeliReport extends Document {
  storeId: mongoose.Types.ObjectId;
  reportId: string;
  reportType: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  dateFrom: Date;
  dateTo: Date;
  downloadUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeliReportSchema = new Schema({
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  reportId: { type: String, required: true },
  reportType: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'READY', 'ERROR'], required: true },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  downloadUrl: { type: String },
}, { timestamps: true });

export const MeliReport = mongoose.model<IMeliReport>('MeliReport', MeliReportSchema);
