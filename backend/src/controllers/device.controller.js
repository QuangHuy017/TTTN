import { parseDeviceQuery } from '../validators/device-query.js';
import { listDevices, listCategories } from '../services/device.service.js';
import Device from '../models/Device.js';
import { withInventory } from '../services/inventory.service.js';

export async function getDevice(req, res) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Mã thiết bị không hợp lệ.' });
  const device = await Device.findById(req.params.id).populate('category', 'name description').lean();
  if (!device || device.deletedAt || device.isPublished === false) return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
  res.json({ data: withInventory(device) });
}

export async function getDevices(req, res) {
  const query = parseDeviceQuery(req.query);
  res.json(await listDevices(query));
}

export async function getCategories(req, res) {
  res.json({ data: await listCategories() });
}
