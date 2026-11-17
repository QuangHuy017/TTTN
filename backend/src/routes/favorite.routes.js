import { Router } from 'express';
import Favorite from '../models/Favorite.js';
import Device from '../models/Device.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { fail } from '../validators/auth.js';
import { withInventory } from '../services/inventory.service.js';

const router = Router();
router.use(authenticate);
router.get('/ids', async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id }).select('device -_id').lean();
  res.json({ data: favorites.map(item => String(item.device)) });
});
router.get('/', async (req, res) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
  // Query the devices themselves so removed assets never leave blank cards or inflate counts.
  const favorites = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1, _id: -1 }).select('device').lean();
  const ids = favorites.map(item => item.device);
  const devices = await Device.find({ _id: { $in: ids }, isPublished: { $ne: false }, deletedAt: null }).select('assetCode name category status condition specifications rentalPricePerDay depositAmount currency images description stockQuantity rentedQuantity').populate('category', 'name description').lean();
  const byId = new Map(devices.map(device => [String(device._id), device]));
  const ordered = ids.map(id => byId.get(String(id))).filter(Boolean).map(withInventory);
  res.json({ data: ordered.slice((page - 1) * 20, page * 20), pagination: { page, total: ordered.length, totalPages: Math.ceil(ordered.length / 20) } });
});
router.param('deviceId', (req, res, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) fail(400, 'Mã thiết bị không hợp lệ.');
  next();
});
router.put('/:deviceId', async (req, res) => {
  if (!await Device.exists({ _id: req.params.deviceId, isPublished: { $ne: false }, deletedAt: null })) fail(404, 'Không tìm thấy thiết bị.');
  try {
    await Favorite.updateOne({ user: req.user._id, device: req.params.deviceId }, { $setOnInsert: { user: req.user._id, device: req.params.deviceId } }, { upsert: true, runValidators: true });
  } catch (error) {
    // Concurrent saves are equivalent to a successful save.
    if (error.code !== 11000) throw error;
  }
  res.json({ data: { deviceId: req.params.deviceId, saved: true } });
});
router.delete('/:deviceId', async (req, res) => {
  await Favorite.deleteOne({ user: req.user._id, device: req.params.deviceId });
  res.json({ data: { deviceId: req.params.deviceId, saved: false } });
});
export default router;
