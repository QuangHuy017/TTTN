import { Schema, model } from 'mongoose';
import { REQUEST_STATUSES } from '../constants/domain.js';
const schema = new Schema({
  borrower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  devices: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Device' }],
    validate: { validator: items => items.length > 0 && new Set(items.map(String)).size === items.length, message: 'Select at least one device without duplicates.' },
  },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  purpose: { type: String, required: true, trim: true },
  status: { type: String, enum: REQUEST_STATUSES, default: 'pending' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String,
}, { timestamps: true });
schema.pre('validate', function () {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) this.invalidate('endAt', 'End date must be after start date.');
});
schema.index({ devices: 1, status: 1, startAt: 1, endAt: 1 });
export default model('BorrowRequest', schema);

