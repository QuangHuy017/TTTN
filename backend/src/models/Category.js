import { Schema, model } from 'mongoose';
export default model('Category', new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: String,
}, { timestamps: true }));
