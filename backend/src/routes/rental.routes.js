import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import Device from '../models/Device.js';
import RentalRequest from '../models/RentalRequest.js';
import { fail } from '../validators/auth.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { inventoryOf } from '../services/inventory.service.js';

export function parseRentalRequest(body, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Thông tin yêu cầu không hợp lệ.');
  if (typeof body.deviceId !== 'string' || !/^[a-f\d]{24}$/i.test(body.deviceId)) fail(400, 'Mã thiết bị không hợp lệ.');
  if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 100) fail(400, 'Số lượng phải từ 1 đến 100 thiết bị.');
  const contact = {};
  for (const [key, max] of [['name', 100], ['phone', 20], ['email', 254], ['address', 300]]) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > max) fail(400, 'Vui lòng điền đầy đủ thông tin liên hệ.');
    contact[key] = body[key].trim();
  }
  if (!/^[+0-9 ()-]{9,20}$/.test(contact.phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) fail(400, 'Email hoặc số điện thoại không hợp lệ.');
  contact.email = contact.email.toLowerCase();
  const parseDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(400, 'Ngày thuê không hợp lệ.');
    const result = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0, 10) !== value) fail(400, 'Ngày thuê không hợp lệ.');
    return result;
  };
  const startAt = parseDate(body.start), endAt = parseDate(body.end);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (body.start < today || endAt <= startAt) fail(400, 'Ngày bắt đầu phải từ hôm nay và ngày trả phải sau ngày bắt đầu.');
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 1000)) fail(400, 'Ghi chú tối đa 1000 ký tự.');
  return { device: body.deviceId, quantity: body.quantity, contact, startAt, endAt, notes: body.notes?.trim() || '' };
}

const router = Router();
router.get('/mine', authenticate, async (req, res) => {
  const data = await RentalRequest.find({ borrower: req.user._id }).populate({ path: 'device', select: 'name assetCode specifications category', populate: { path: 'category', select: 'name' } }).sort({ createdAt: -1 }).lean();
  res.json({ data });
});
router.patch('/:id/cancel', authenticate, async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) fail(400, 'Mã yêu cầu không hợp lệ.');
  const data = await RentalRequest.findOneAndUpdate({ _id: req.params.id, borrower: req.user._id, status: 'pending' }, { $set: { status: 'cancelled' } }, { new: true });
  if (!data) fail(409, 'Không thể hủy yêu cầu. Chỉ yêu cầu của bạn đang chờ duyệt mới có thể hủy.');
  res.json({ data: { _id: data._id, status: data.status } });
});
const optionalAuth = (req, res, next) => req.get('authorization') ? authenticate(req, res, next) : next();
router.post('/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.' } }), optionalAuth, async (req, res) => {
  const input = parseRentalRequest(req.body);
  const device = await Device.findById(input.device);
  if (!device || device.deletedAt || device.isPublished === false) fail(404, 'Không tìm thấy thiết bị.');
  if (device.status !== 'available') fail(409, 'Thiết bị hiện chưa sẵn sàng cho thuê.');
  if (input.quantity > inventoryOf(device).stockQuantity) fail(409, `Trong kho hiện chỉ còn ${inventoryOf(device).stockQuantity} thiết bị. Vui lòng giảm số lượng.`);
  const days = (input.endAt - input.startAt) / 86400000;
  const rentalAmount = device.rentalPricePerDay * days * input.quantity;
  const depositAmount = device.depositAmount * input.quantity;
  if (!Number.isSafeInteger(rentalAmount + depositAmount)) fail(400, 'Chi phí yêu cầu vượt giới hạn cho phép.');
  const request = await RentalRequest.create({ ...input, ...(req.user ? { borrower: req.user._id } : {}), pricePerDay: device.rentalPricePerDay, rentalAmount, depositAmount });
  res.status(201).json({ data: { _id: request._id, status: request.status, quantity: request.quantity, rentalAmount, depositAmount }, message: 'Đã gửi yêu cầu thuê. Số lượng và lịch trống sẽ được xác nhận khi duyệt.' });
});
export default router;
