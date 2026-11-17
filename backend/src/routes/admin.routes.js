import { Router } from 'express';
import express from 'express';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { imageType, uploadBuffer, imageReceipt, verifyImageReceipt } from '../services/image.service.js';
import Device from '../models/Device.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import RentalRequest from '../models/RentalRequest.js';
import BorrowRequest from '../models/BorrowRequest.js';
import { performRentalAction } from '../services/rental-workflow.service.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { fail } from '../validators/auth.js';
import { DEVICE_STATUSES } from '../constants/domain.js';
import staffRouter from './staff.routes.js';
import { withInventory, inventoryOf, bookedPeak } from '../services/inventory.service.js';

export function parseDevice(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Thông tin thiết bị không hợp lệ.');
  const data = {};
  if (body.stockQuantity !== undefined) {
    if (!Number.isSafeInteger(body.stockQuantity) || body.stockQuantity < 0 || body.stockQuantity > 1000000) fail(400, 'Số lượng trong kho phải là số nguyên từ 0 đến 1000000.');
    data.stockQuantity = body.stockQuantity;
  }
  if (body.specifications !== undefined) {
    const specs = body.specifications;
    if (!specs || typeof specs !== 'object' || Array.isArray(specs) || Object.keys(specs).length > 50) fail(400, 'Tối đa 50 thông số kỹ thuật.');
    const entries = Object.entries(specs).map(([key, value]) => {
      const name = key.trim();
      if (!name || name.length > 80 || /[.$]/.test(name) || [...name].some(character => character.charCodeAt(0) < 32) || ['__proto__', 'constructor', 'prototype'].includes(name)) fail(400, 'Tên thông số không hợp lệ.');
      if (typeof value !== 'string' || value.length > 1000) fail(400, 'Mỗi thông số tối đa 1000 ký tự.');
      return [name, value.trim()];
    }).filter(([, value]) => value !== '');
    if (new Set(entries.map(([key]) => key)).size !== entries.length) fail(400, 'Tên thông số không được trùng nhau.');
    data.specifications = Object.fromEntries(entries);
  }
  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.length > 10000) fail(400, 'Mô tả tối đa 10000 ký tự.');
    data.description = body.description.trim();
  }
  if (body.isPublished !== undefined) {
    if (typeof body.isPublished !== 'boolean') fail(400, 'Trạng thái hiển thị không hợp lệ.');
    data.isPublished = body.isPublished;
  }
  for (const key of ['name', 'assetCode', 'category', 'status']) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 200) fail(400, 'Vui lòng điền đầy đủ thông tin thiết bị.');
    data[key] = body[key].trim();
  }
  if (!/^[a-f\d]{24}$/i.test(data.category) || !DEVICE_STATUSES.includes(data.status)) fail(400, 'Danh mục hoặc trạng thái không hợp lệ.');
  for (const key of ['rentalPricePerDay', 'depositAmount']) {
    if (key === 'depositAmount' && body[key] === undefined) continue;
    if (body[key] === null && body.isPublished === false) { data[key] = null; continue; }
    if (!Number.isSafeInteger(body[key]) || body[key] < 0) fail(400, 'Giá tiền phải là số nguyên không âm.');
    data[key] = body[key];
  }
  for (const key of ['location', 'condition']) {
    if (key === 'location' && body[key] === undefined) continue;
    if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > 300)) fail(400, 'Thông tin vị trí hoặc tình trạng quá dài.');
    data[key] = body[key]?.trim() || '';
  }
  return data;
}

const router = Router();
router.use(authenticate, authorize('admin', 'staff'));
router.use('/staff', authorize('admin'), staffRouter);
router.post('/device-images', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, message: { message: 'Đã tải quá nhiều ảnh. Vui lòng thử lại sau.' } }), express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'], limit: '10mb' }), async (req, res) => {
  const mime = imageType(req.body);
  if (!mime) fail(400, 'Chỉ hỗ trợ ảnh JPG, PNG, WebP, GIF và AVIF.');
  let filename;
  try { filename = decodeURIComponent(req.get('x-file-name') || 'image'); } catch { fail(400, 'Tên tệp không hợp lệ.'); }
  filename = filename.split(/[\\/]/).at(-1).slice(0, 200);
  const image = await uploadBuffer(req.body, filename, mime);
  res.status(201).json({ data: { ...image, uploadToken: imageReceipt(image, req.user._id) } });
});
router.get('/overview', authorize('admin'), async (req, res) => {
  const [devices, available, maintenance, users, requests, pending, active, completed] = await Promise.all([
    Device.countDocuments({ deletedAt: null }), Device.countDocuments({ deletedAt: null, status: 'available' }), Device.countDocuments({ deletedAt: null, status: 'maintenance' }),
    User.countDocuments({ deletedAt: null }), RentalRequest.countDocuments(), RentalRequest.countDocuments({ status: 'pending' }),
    RentalRequest.countDocuments({ status: { $in: ['approved', 'borrowed'] } }), RentalRequest.countDocuments({ status: 'completed' }),
  ]);
  res.json({ data: { devices, available, maintenance, users, requests, pending, active, completed } });
});
router.get('/users', authorize('admin'), async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const [data, total] = await Promise.all([
    User.find({ deletedAt: null }).select('fullName email role isActive createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
    User.countDocuments({ deletedAt: null }),
  ]);
  res.json({ data, pagination: { page, total, pages: Math.ceil(total / 20) } });
});
router.get('/devices', async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const filter = { deletedAt: null };
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const pattern = req.query.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: pattern, $options: 'i' } }, { assetCode: { $regex: pattern, $options: 'i' } }];
  }
  const [data, total] = await Promise.all([Device.find(filter).populate('category', 'name').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(), Device.countDocuments(filter)]);
  res.json({ data: data.map(withInventory), pagination: { page, total, pages: Math.ceil(total / 20) } });
});
async function saveDevice(req, res) {
  const input = parseDevice(req.body);
  if (!await Category.exists({ _id: input.category })) fail(400, 'Danh mục không tồn tại.');
  if (req.params.id && !/^[a-f\d]{24}$/i.test(req.params.id)) fail(400, 'Mã thiết bị không hợp lệ.');
  if (req.body.images !== undefined) {
    if (!Array.isArray(req.body.images) || req.body.images.length > 20) fail(400, 'Mỗi thiết bị tối đa 20 ảnh.');
    const existing = req.params.id ? await Device.findById(req.params.id).select('images deletedAt').lean() : null;
    if (req.params.id && (!existing || existing.deletedAt)) fail(404, 'Không tìm thấy thiết bị.');
    const known = new Map((existing?.images || []).map(image => [image.publicId, image]));
    input.images = req.body.images.map(image => {
      if (!image || typeof image !== 'object') fail(400, 'Thông tin ảnh không hợp lệ.');
      if (typeof image.uploadToken === 'string') return verifyImageReceipt(image.uploadToken, req.user._id);
      if (!known.has(image.publicId)) fail(400, 'Ảnh chưa được tải lên hợp lệ.');
      return known.get(image.publicId);
    });
    if (new Set(input.images.map(image => image.publicId)).size !== input.images.length) fail(400, 'Danh sách ảnh bị trùng.');
  }
  try {
    let data;
    if (req.params.id && input.stockQuantity !== undefined) {
      data = await mongoose.connection.transaction(async session => {
        const current = await Device.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { $inc: { bookingVersion: 1 } }, { new: true, session });
        if (!current) fail(404, 'Không tìm thấy thiết bị.');
        const inventory = inventoryOf(current);
        const booked = await bookedPeak(current._id, session);
        if (input.stockQuantity + inventory.rentedQuantity < booked) fail(409, 'Không thể giảm tồn kho vì số lượng mới không đủ cho các đơn đã duyệt/đang thuê.');
        const changes = { ...input, rentedQuantity: inventory.rentedQuantity };
        if (changes.stockQuantity === 0 && changes.status === 'available') changes.status = inventory.rentedQuantity > 0 ? 'borrowed' : 'out_of_stock';
        if (changes.stockQuantity > 0 && changes.status === 'out_of_stock') changes.status = 'available';
        return Device.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { $set: changes }, { new: true, runValidators: true, session });
      });
    } else if (req.params.id) data = await Device.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { $set: input }, { new: true, runValidators: true });
    else {
      input.stockQuantity ??= input.status === 'borrowed' ? 0 : 1;
      input.rentedQuantity = input.status === 'borrowed' && req.body.stockQuantity === undefined ? 1 : 0;
      if (input.stockQuantity === 0 && input.status === 'available') input.status = 'out_of_stock';
      data = await Device.create(input);
    }
    if (!data) fail(404, 'Không tìm thấy thiết bị.');
    res.status(req.params.id ? 200 : 201).json({ data: withInventory(data) });
  } catch (error) {
    if (error.code === 11000) fail(409, 'Mã tài sản đã tồn tại.');
    throw error;
  }
}
router.post('/devices', saveDevice);
router.patch('/devices/:id', saveDevice);
router.delete('/devices/:id', async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) fail(400, 'Mã thiết bị không hợp lệ.');
  const device = await Device.findById(req.params.id);
  if (!device || device.deletedAt) fail(404, 'Không tìm thấy thiết bị.');
  const statuses = ['pending', 'approved', 'borrowed'];
  const [rental, borrow] = await Promise.all([
    RentalRequest.exists({ device: device._id, status: { $in: statuses } }),
    BorrowRequest.exists({ devices: device._id, status: { $in: statuses } }),
  ]);
  if (device.status === 'borrowed' || inventoryOf(device).rentedQuantity > 0 || rental || borrow) fail(409, 'Thiết bị đang cho thuê hoặc có yêu cầu chưa hoàn tất. Vui lòng xử lý yêu cầu trước khi xóa.');
  const data = await Device.findOneAndUpdate({ _id: req.params.id, deletedAt: null, status: { $ne: 'borrowed' } }, { $set: { deletedAt: new Date(), isPublished: false } }, { new: true });
  if (!data) fail(409, 'Thiết bị vừa thay đổi. Vui lòng tải lại danh sách.');
  res.json({ data: { _id: data._id }, message: 'Đã xóa thiết bị.' });
});
router.get('/requests', async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  const statuses = ['pending', 'approved', 'borrowed', 'completed', 'rejected', 'cancelled'];
  const filter = statuses.includes(req.query.status) ? { status: req.query.status } : {};
  const [data, total] = await Promise.all([
    RentalRequest.find(filter).populate('device', 'name assetCode').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
    RentalRequest.countDocuments(filter),
  ]);
  res.json({ data, pagination: { page, total, pages: Math.ceil(total / 20) } });
});
router.patch('/requests/:id/:action', async (req, res) => {
  const data = await performRentalAction(req.params.id, req.params.action, req.user._id, req.body?.reason ?? '');
  res.json({ data });
});
export default router;
