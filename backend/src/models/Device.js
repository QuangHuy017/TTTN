import { Schema, model } from 'mongoose';
import { DEVICE_STATUSES } from '../constants/domain.js';
// Each document is a device type/stock pool, with independent rental quantities.
const schema = new Schema({
  assetCode: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', maxlength: 10000 },
  isPublished: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
  bookingVersion: { type: Number, default: 0 },
  images: [{
    _id: false,
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    originalName: String,
    width: Number,
    height: Number,
  }],
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  status: { type: String, enum: DEVICE_STATUSES, default: 'available' },
  stockQuantity: { type: Number, min: 0, max: 1000000, validate: Number.isInteger },
  rentedQuantity: { type: Number, min: 0, max: 1000000, validate: Number.isInteger },
  location: String,
  condition: String,
  rentalPricePerDay: { type: Number, min: 0, default: 0 },
  depositAmount: { type: Number, min: 0, default: 0 },
  currency: { type: String, enum: ['VND'], default: 'VND' },
  specifications: { type: Map, of: String },
}, { timestamps: true });
schema.index({ category: 1, rentalPricePerDay: 1, _id: 1 });
schema.index({ rentalPricePerDay: 1, _id: 1 });
export default model('Device', schema);

