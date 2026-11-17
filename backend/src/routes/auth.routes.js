import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { parseCredentials, fail } from '../validators/auth.js';
import { authResponse, createUser, login, publicUser, passwordMatches } from '../services/auth.service.js';
import { parseProfile } from '../validators/profile.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import User from '../models/User.js';
const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many attempts. Try again later.' } });
router.post('/register', limiter, async (req, res) => {
  const user = await createUser(parseCredentials(req.body, true));
  res.status(201).json(authResponse(user));
});
router.post('/login', limiter, async (req, res) => {
  res.json(await login(parseCredentials(req.body)));
});
router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
router.patch('/me', authenticate, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user._id, { $set: parseProfile(req.body) }, { new: true, runValidators: true });
  if (!user || !user.isActive) fail(401, 'Tài khoản không còn hoạt động.');
  res.json({ user: publicUser(user) });
});
router.post('/change-password', authenticate, rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { message: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' } }), async (req, res) => {
  const body = req.body;
  if (!body || Object.keys(body).some(key => !['currentPassword', 'newPassword'].includes(key)) || ['currentPassword', 'newPassword'].some(key => typeof body[key] !== 'string' || body[key].length < 8 || body[key].length > 128)) fail(400, 'Mật khẩu phải từ 8 đến 128 ký tự.');
  const user = await User.findById(req.user._id).select('+password +passwordHash');
  if (!user || !user.isActive || !await passwordMatches(user, body.currentPassword)) fail(400, 'Mật khẩu hiện tại không đúng.');
  if (body.currentPassword === body.newPassword) fail(400, 'Mật khẩu mới phải khác mật khẩu hiện tại.');
  const filter = { _id: user._id, isActive: true, ...(typeof user.password === 'string' ? { password: user.password } : { passwordHash: user.passwordHash }), ...((user.tokenVersion || 0) === 0 ? { $or: [{ tokenVersion: 0 }, { tokenVersion: { $exists: false } }] } : { tokenVersion: user.tokenVersion }) };
  const updated = await User.findOneAndUpdate(filter, { $set: { password: body.newPassword }, $unset: { passwordHash: '' }, $inc: { tokenVersion: 1 } }, { new: true, runValidators: true });
  if (!updated) fail(409, 'Tài khoản vừa thay đổi. Vui lòng đăng nhập lại.');
  res.json({ ...authResponse(updated), message: 'Đổi mật khẩu thành công.' });
});
export default router;

export const userRouter = Router();
// Admin creates staff/admin accounts; self-registration can never assign these roles.
userRouter.post('/', authenticate, authorize('admin'), async (req, res) => {
  const user = await createUser(parseCredentials(req.body, true, true));
  res.status(201).json({ user: publicUser(user) });
});
userRouter.get('/', authenticate, authorize('admin'), async (req, res) => {
  const users = await User.find({ deletedAt: null }).select('fullName email role isActive').sort({ _id: 1 }).limit(100).lean();
  res.json({ data: users });
});
