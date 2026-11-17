import { Schema, model } from 'mongoose';
import { ROLES } from '../constants/domain.js';
const schema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  gender: { type: String, enum: ['', 'male', 'female', 'other', 'undisclosed'], default: '' },
  birthDate: { type: String, default: '' },
  tokenVersion: { type: Number, default: 0 },
  // Plaintext storage is explicitly requested for this project; never select it for public responses.
  password: { type: String, minlength: 8, maxlength: 128, select: false, required() { return this.isNew && !this.passwordHash; } },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ROLES, default: 'renter' },
  department: String,
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
export default model('User', schema);
