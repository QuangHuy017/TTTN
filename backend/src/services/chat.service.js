import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import { fail } from '../validators/auth.js';
export const isSupport = user => ['staff', 'admin'].includes(user.role);
export function assertChatAccess(conversation, user) {
  if (!conversation) fail(404, 'Không tìm thấy cuộc trò chuyện.');
  const owner = conversation.customer?._id || conversation.customer;
  if (!isSupport(user) && String(owner) !== String(user._id)) fail(404, 'Không tìm thấy cuộc trò chuyện.');
}
export function parseChatMessage(body) {
  if (!body || typeof body.content !== 'string' || !body.content.trim() || body.content.length > 2000) fail(400, 'Tin nhắn phải từ 1 đến 2000 ký tự.');
  if (typeof body.clientId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.clientId)) fail(400, 'Mã tin nhắn không hợp lệ.');
  return { content: body.content.trim(), clientId: body.clientId };
}
export async function sendChatMessage(id, user, body) {
  const input = parseChatMessage(body);
  return mongoose.connection.transaction(async session => {
    const conversation = await Conversation.findOneAndUpdate({ _id: id }, { $inc: { revision: 1 } }, { new: true, session });
    assertChatAccess(conversation, user);
    const duplicate = await ChatMessage.findOne({ conversation: id, sender: user._id, clientId: input.clientId }).session(session);
    if (duplicate) return duplicate;
    const sequence = conversation.sequence + 1;
    const staff = isSupport(user);
    const [message] = await ChatMessage.create([{ ...input, conversation: id, sender: user._id, senderName: user.fullName, senderRole: user.role, sequence }], { session });
    await Conversation.updateOne({ _id: id }, {
      $set: { sequence, lastMessage: input.content.slice(0, 160), lastMessageAt: message.createdAt, lastSenderName: user.fullName, [staff ? 'staffReadSequence' : 'customerReadSequence']: sequence, [staff ? 'staffUnread' : 'customerUnread']: 0 },
      $inc: { [staff ? 'customerUnread' : 'staffUnread']: 1 },
    }, { session });
    return message;
  });
}
export async function readChat(id, user, throughSequence) {
  if (!Number.isSafeInteger(throughSequence) || throughSequence < 0) fail(400, 'Vị trí đọc tin không hợp lệ.');
  return mongoose.connection.transaction(async session => {
    const conversation = await Conversation.findOneAndUpdate({ _id: id }, { $inc: { revision: 1 } }, { new: true, session });
    assertChatAccess(conversation, user);
    const staff = isSupport(user);
    const field = staff ? 'staffReadSequence' : 'customerReadSequence';
    const through = Math.max(conversation[field] || 0, Math.min(throughSequence, conversation.sequence));
    const unread = await ChatMessage.countDocuments({ conversation: id, sequence: { $gt: through }, senderRole: staff ? 'renter' : { $in: ['staff', 'admin'] } }).session(session);
    await Conversation.updateOne({ _id: id }, { $set: { [field]: through, [staff ? 'staffUnread' : 'customerUnread']: unread } }, { session });
    return { throughSequence: through, unread };
  });
}
