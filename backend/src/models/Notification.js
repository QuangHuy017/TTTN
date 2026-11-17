import { Schema, model } from 'mongoose';
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rentalRequest: { type: Schema.Types.ObjectId, ref: 'RentalRequest', required: true },
  type: { type: String, enum: ['rental_approved'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ user: 1, rentalRequest: 1, type: 1 }, { unique: true });
schema.index({ user: 1, createdAt: -1, _id: -1 });
schema.index({ user: 1, readAt: 1 });
export default model('Notification', schema);
