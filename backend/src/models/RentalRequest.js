import { Schema, model } from 'mongoose';

const schema = new Schema({
  borrower: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  device: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
  quantity: { type: Number, required: true, min: 1, max: 100 },
  contact: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
  },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  notes: String,
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: { type: String, maxlength: 1000 },
  handedOverBy: { type: Schema.Types.ObjectId, ref: 'User' },
  handedOverAt: Date,
  returnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  returnedAt: Date,
  pricePerDay: { type: Number, required: true },
  rentalAmount: { type: Number, required: true },
  depositAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'borrowed', 'completed', 'rejected', 'cancelled'], default: 'pending' },
}, { timestamps: true });
schema.index({ device: 1, status: 1, startAt: 1, endAt: 1 });

export default model('RentalRequest', schema);
