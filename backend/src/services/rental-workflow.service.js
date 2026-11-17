import mongoose from 'mongoose';
import Device from '../models/Device.js';
import RentalRequest from '../models/RentalRequest.js';
import BorrowRequest from '../models/BorrowRequest.js';
import { fail } from '../validators/auth.js';
import Notification from '../models/Notification.js';
import { inventoryOf, bookedPeak } from './inventory.service.js';

export const rentalActions = {
  approve: { from: ['pending'], to: 'approved' },
  reject: { from: ['pending', 'approved'], to: 'rejected' },
  handover: { from: ['approved'], to: 'borrowed' },
  return: { from: ['borrowed'], to: 'completed' },
};
export function validateRentalAction(request, device, action) {
  const transition = Object.hasOwn(rentalActions, action) ? rentalActions[action] : null;
  if (!transition) fail(400, 'Thao tác không hợp lệ.');
  if (!request) fail(404, 'Không tìm thấy yêu cầu thuê.');
  if (!transition.from.includes(request.status)) fail(409, 'Trạng thái đơn đã thay đổi hoặc không phù hợp với thao tác. Vui lòng làm mới danh sách.');
  if (action === 'reject') return transition;
  if (!device || device.deletedAt) fail(409, 'Thiết bị không còn trong danh mục.');
  if (action === 'approve' || action === 'handover') {
    if (!Number.isInteger(request.quantity) || request.quantity < 1) fail(409, 'Số lượng thuê không hợp lệ.');
    const inventory = inventoryOf(device);
    if (request.quantity > inventory.stockQuantity + inventory.rentedQuantity) fail(409, 'Số lượng yêu cầu vượt quá tổng số thiết bị.');
    if (!device.isPublished && device.isPublished !== undefined) fail(409, 'Thiết bị đang ở bản nháp. Vui lòng kiểm tra lại trước khi duyệt hoặc giao.');
    if (!['available', 'borrowed'].includes(device.status)) fail(409, 'Thiết bị đang bảo trì hoặc không sẵn sàng.');
  }
  if (action === 'handover' && (device.status !== 'available' || inventoryOf(device).stockQuantity < request.quantity)) fail(409, 'Trong kho không đủ thiết bị để giao.');
  if (action === 'return' && inventoryOf(device).rentedQuantity < request.quantity) fail(409, 'Số lượng đang cho thuê không khớp. Vui lòng kiểm tra trước khi nhận lại.');
  return transition;
}
export async function performRentalAction(id, action, userId, reason = '', now = new Date()) {
  if (!/^[a-f\d]{24}$/i.test(id)) fail(400, 'Mã yêu cầu không hợp lệ.');
  if (!Object.hasOwn(rentalActions, action)) fail(400, 'Thao tác không hợp lệ.');
  if (typeof reason !== 'string' || reason.length > 1000) fail(400, 'Lý do tối đa 1000 ký tự.');
  return mongoose.connection.transaction(async session => {
    const request = await RentalRequest.findById(id).session(session);
    if (!request) fail(404, 'Không tìm thấy yêu cầu thuê.');
    let device = null;
    if (action !== 'reject') {
      // Serialize decisions for one physical asset, including overlapping approvals.
      device = await Device.findOneAndUpdate({ _id: request.device, deletedAt: null }, { $inc: { bookingVersion: 1 } }, { new: true, session });
    }
    const transition = validateRentalAction(request, device, action);
    if (action === 'approve' || action === 'handover') {
      const booked = await bookedPeak(request.device, session, request._id, request.startAt, request.endAt);
      const inventory = inventoryOf(device);
      if (booked + request.quantity > inventory.stockQuantity + inventory.rentedQuantity) fail(409, 'Không đủ số lượng thiết bị trong lịch thuê này. Vui lòng kiểm tra tồn kho và các đơn đã duyệt.');
    }
    const changes = { status: transition.to };
    if (['approve', 'reject'].includes(action)) Object.assign(changes, { reviewedBy: userId, reviewedAt: now, rejectionReason: action === 'reject' ? reason.trim() : '' });
    if (action === 'handover') Object.assign(changes, { handedOverBy: userId, handedOverAt: now });
    if (action === 'return') Object.assign(changes, { returnedBy: userId, returnedAt: now });
    const updated = await RentalRequest.findOneAndUpdate({ _id: id, status: request.status }, { $set: changes }, { new: true, runValidators: true, session });
    if (!updated) fail(409, 'Đơn vừa được xử lý bởi người khác. Vui lòng làm mới danh sách.');
    if (action === 'handover' || action === 'return') {
      const inventory = inventoryOf(device);
      const stockQuantity = inventory.stockQuantity + (action === 'return' ? request.quantity : -request.quantity);
      const rentedQuantity = inventory.rentedQuantity + (action === 'return' ? -request.quantity : request.quantity);
      const status = ['available', 'borrowed', 'out_of_stock'].includes(device.status) ? stockQuantity > 0 ? 'available' : rentedQuantity > 0 ? 'borrowed' : 'out_of_stock' : device.status;
      const result = await Device.updateOne({ _id: request.device, deletedAt: null, status: device.status }, { $set: { status, stockQuantity, rentedQuantity } }, { session });
      if (result.modifiedCount !== 1) fail(409, 'Trạng thái thiết bị vừa thay đổi. Vui lòng kiểm tra lại.');
    }
    if (action === 'approve' && request.borrower) {
      const code = String(request._id).slice(-8).toUpperCase();
      await Notification.updateOne({ user: request.borrower, rentalRequest: request._id, type: 'rental_approved' }, { $setOnInsert: {
        user: request.borrower, rentalRequest: request._id, type: 'rental_approved', title: 'Yêu cầu thuê đã được duyệt',
        message: `Yêu cầu #${code} thuê ${device.name || 'thiết bị'} đã được duyệt. Bạn có thể xem chi tiết trong Đơn hàng của tôi.`, readAt: null,
      } }, { upsert: true, session, runValidators: true });
    }
    return { _id: updated._id, status: updated.status };
  });
}
