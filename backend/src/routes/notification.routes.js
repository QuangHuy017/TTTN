import { Router } from 'express';
import Notification from '../models/Notification.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { fail } from '../validators/auth.js';
const router = Router();
router.use(authenticate);
router.get('/', async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const [data, total, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
    Notification.countDocuments({ user: req.user._id }), Notification.countDocuments({ user: req.user._id, readAt: null }),
  ]);
  res.json({ data, unreadCount, pagination: { page, total, totalPages: Math.ceil(total / 20) } });
});
router.patch('/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ message: 'Đã đánh dấu tất cả là đã đọc.' });
});
router.patch('/:id/read', async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) fail(400, 'Mã thông báo không hợp lệ.');
  const data = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { readAt: new Date() } }, { new: true });
  if (!data) fail(404, 'Không tìm thấy thông báo.');
  res.json({ data });
});
export default router;
