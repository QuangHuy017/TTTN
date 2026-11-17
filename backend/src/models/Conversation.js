import { Schema, model } from 'mongoose';
const schema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  sequence: { type: Number, default: 0 },
  revision: { type: Number, default: 0 },
  customerReadSequence: { type: Number, default: 0 },
  staffReadSequence: { type: Number, default: 0 },
  customerUnread: { type: Number, default: 0 },
  staffUnread: { type: Number, default: 0 },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  lastSenderName: String,
}, { timestamps: true });
schema.index({ lastMessageAt: -1, _id: -1 });
schema.index({ staffUnread: 1, lastMessageAt: -1 });
export default model('Conversation', schema);
