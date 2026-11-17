import { Router } from 'express';
import User from '../models/User.js';
import { fail } from '../validators/auth.js';
import { parseProfile } from '../validators/profile.js';

export function parseStaff(body, creation = false) {
  const allowed = ['fullName', 'email', 'phone', 'isActive', 'password'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) fail(400, 'Thông tin nhân viên không hợp lệ.');
  const data = {};
  if (creation && typeof body.fullName !== 'string') fail(400, 'Vui lòng nhập họ tên nhân viên.');
  if (creation || body.fullName !== undefined) Object.assign(data, parseProfile({ fullName: body.fullName }));
  if (creation || body.email !== undefined) {
    if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) fail(400, 'Email không hợp lệ.');
    data.email = body.email.trim().toLowerCase();
  }
  if (body.phone !== undefined) Object.assign(data, parseProfile({ phone: body.phone }));
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') fail(400, 'Trạng thái nhân viên không hợp lệ.');
    data.isActive = body.isActive;
  }
  if (creation || body.password !== undefined && body.password !== '') {
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) fail(400, 'Mật khẩu phải từ 8 đến 128 ký tự.');
    data.password = body.password;
  }
  if (!Object.keys(data).length) fail(400, 'Chưa có thông tin cần cập nhật.');
  return data;
}
export const staffFields = 'fullName email phone role isActive createdAt updatedAt';
export function publicStaff(user) {
  return { _id: user._id, fullName: user.fullName, email: user.email, phone: user.phone || '', role: user.role, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt };
}
const router = Router();
router.get('/', async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const filter = { role: 'staff', deletedAt: null };
  if (req.query.active !== undefined && req.query.active !== '') {
    if (!['true', 'false'].includes(req.query.active)) fail(400, 'Bộ lọc trạng thái không hợp lệ.');
    filter.isActive = req.query.active === 'true';
  }
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const pattern = req.query.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['fullName', 'email', 'phone'].map(key => ({ [key]: { $regex: pattern, $options: 'i' } }));
  }
  const [data, total] = await Promise.all([
    User.find(filter).select(staffFields).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ data: data.map(publicStaff), pagination: { page, total, totalPages: Math.ceil(total / 20) } });
});
router.post('/', async (req, res) => {
  const input = parseStaff(req.body, true);
  try {
    const data = await User.create({ ...input, role: 'staff' });
    res.status(201).json({ data: publicStaff(data) });
  } catch (error) { if (error.code === 11000) fail(409, 'Email đã được sử dụng. Vui lòng chọn email khác.'); throw error; }
});
router.param('id', (req, res, next, id) => { if (!/^[a-f\d]{24}$/i.test(id)) fail(400, 'Mã nhân viên không hợp lệ.'); next(); });
router.patch('/:id', async (req, res) => {
  const input = parseStaff(req.body);
  const filter = { _id: req.params.id, role: 'staff', deletedAt: null };
  const current = await User.findOne(filter);
  if (!current) fail(404, 'Không tìm thấy nhân viên.');
  const revoke = input.password !== undefined || input.email !== undefined && input.email !== current.email || input.isActive !== undefined && input.isActive !== current.isActive;
  const update = { $set: input, ...(revoke ? { $inc: { tokenVersion: 1 } } : {}), ...(input.password !== undefined ? { $unset: { passwordHash: '' } } : {}) };
  try {
    const data = await User.findOneAndUpdate(filter, update, { new: true, runValidators: true });
    if (!data) fail(404, 'Nhân viên không còn tồn tại. Vui lòng tải lại danh sách.');
    res.json({ data: publicStaff(data) });
  } catch (error) { if (error.code === 11000) fail(409, 'Email đã được sử dụng. Vui lòng chọn email khác.'); throw error; }
});
router.delete('/:id', async (req, res) => {
  const data = await User.findOneAndUpdate({ _id: req.params.id, role: 'staff', deletedAt: null }, { $set: { isActive: false, deletedAt: new Date() }, $inc: { tokenVersion: 1 } }, { new: true });
  if (!data) fail(404, 'Không tìm thấy nhân viên.');
  res.json({ data: { _id: data._id }, message: 'Đã xóa nhân viên.' });
});
export default router;
