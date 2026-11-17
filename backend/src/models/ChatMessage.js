import { Schema, model } from 'mongoose';
const schema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['renter', 'staff', 'admin'], required: true },
  content: { type: String, required: true, maxlength: 2000 },
  sequence: { type: Number, required: true },
  clientId: { type: String, required: true },
}, { timestamps: true });
schema.index({ conversation: 1, sequence: 1 }, { unique: true });
schema.index({ conversation: 1, sender: 1, clientId: 1 }, { unique: true });
export default model('ChatMessage', schema);
