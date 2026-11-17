import { Schema, model } from 'mongoose';

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  device: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
}, { timestamps: true });
schema.index({ user: 1, device: 1 }, { unique: true });
schema.index({ user: 1, createdAt: -1, _id: -1 });
export default model('Favorite', schema);
