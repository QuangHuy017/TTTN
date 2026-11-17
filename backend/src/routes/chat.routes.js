import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import Conversation from '../models/Conversation.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { fail } from '../validators/auth.js';
import { assertChatAccess, isSupport, readChat, sendChatMessage } from '../services/chat.service.js';
const router = Router();
router.use(authenticate);
router.get('/summary', async (req, res) => {
  if (isSupport(req.user)) {
    const unreadConversations = await Conversation.countDocuments({ staffUnread: { $gt: 0 } });
    return res.json({ unreadCount: unreadConversations, staff: true });
  }
  const conversation = await Conversation.findOne({ customer: req.user._id }).select('customerUnread').lean();
  res.json({ unreadCount: conversation?.customerUnread || 0, staff: false });
});
router.post('/mine', authorize('renter'), async (req, res) => {
  let data;
  try { data = await Conversation.findOneAndUpdate({ customer: req.user._id }, { $setOnInsert: { customer: req.user._id } }, { upsert: true, new: true, runValidators: true }); }
  catch (error) { if (error.code !== 11000) throw error; data = await Conversation.findOne({ customer: req.user._id }); }
  res.json({ data });
});
router.get('/conversations', authorize('staff', 'admin'), async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const filter = req.query.unread === 'true' ? { staffUnread: { $gt: 0 } } : {};
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const escaped = req.query.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const customers = await User.find({ $or: [{ fullName: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }] }).select('_id').lean();
    filter.customer = { $in: customers.map(user => user._id) };
  }
  const [data, total] = await Promise.all([
    Conversation.find(filter).populate('customer', 'fullName email phone isActive').sort({ lastMessageAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
    Conversation.countDocuments(filter),
  ]);
  res.json({ data, pagination: { page, total, totalPages: Math.ceil(total / 20) } });
});
router.param('id', (req, res, next, id) => { if (!/^[a-f\d]{24}$/i.test(id)) fail(400, 'Mã cuộc trò chuyện không hợp lệ.'); next(); });
router.get('/conversations/:id/messages', async (req, res) => {
  const conversation = await Conversation.findById(req.params.id).populate('customer', 'fullName email phone');
  assertChatAccess(conversation, req.user);
  const filter = { conversation: req.params.id };
  const after = req.query.after, before = req.query.before;
  if (after !== undefined && before !== undefined) fail(400, 'Chỉ dùng một mốc tải tin nhắn.');
  for (const value of [after, before]) if (value !== undefined && (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) fail(400, 'Mốc tin nhắn không hợp lệ.');
  if (after !== undefined) filter.sequence = { $gt: Number(after) };
  if (before !== undefined) filter.sequence = { $lt: Number(before) };
  const messages = await ChatMessage.find(filter).sort({ sequence: after !== undefined ? 1 : -1 }).limit(51).lean();
  const hasMore = messages.length > 50;
  const data = messages.slice(0, 50);
  if (after === undefined) data.reverse();
  res.json({ data, conversation, hasMore, nextBefore: data[0]?.sequence || null });
});
router.post('/conversations/:id/messages', rateLimit({ windowMs: 60 * 1000, limit: 30, message: { message: 'Bạn gửi tin quá nhanh. Vui lòng chờ một chút.' } }), async (req, res) => {
  const data = await sendChatMessage(req.params.id, req.user, req.body);
  res.status(201).json({ data });
});
router.patch('/conversations/:id/read', async (req, res) => res.json({ data: await readChat(req.params.id, req.user, req.body?.throughSequence) }));
export default router;
