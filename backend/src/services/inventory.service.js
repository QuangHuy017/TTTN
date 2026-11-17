import RentalRequest from '../models/RentalRequest.js';
import BorrowRequest from '../models/BorrowRequest.js';
export function inventoryOf(device) {
  return {
    stockQuantity: Number.isSafeInteger(device.stockQuantity) ? device.stockQuantity : device.status === 'borrowed' ? 0 : 1,
    rentedQuantity: Number.isSafeInteger(device.rentedQuantity) ? device.rentedQuantity : device.status === 'borrowed' ? 1 : 0,
  };
}
export function withInventory(device) {
  const data = typeof device.toObject === 'function' ? device.toObject() : device;
  return { ...data, ...inventoryOf(data) };
}
// End events precede starts at the same instant: returning on a day frees that day.
export function peakQuantity(bookings, start, end) {
  const events = [];
  for (const booking of bookings) {
    const from = Math.max(+new Date(booking.startAt), start ? +new Date(start) : -Infinity);
    const to = Math.min(+new Date(booking.endAt), end ? +new Date(end) : Infinity);
    if (from < to) { events.push([from, booking.quantity || 1], [to, -(booking.quantity || 1)]); }
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let current = 0, peak = 0;
  for (const [, delta] of events) { current += delta; peak = Math.max(peak, current); }
  return peak;
}
export async function bookedPeak(deviceId, session, excludingId, start, end) {
  const dates = start && end ? { startAt: { $lt: end }, endAt: { $gt: start } } : {};
  const bookings = await RentalRequest.find({ device: deviceId, status: { $in: ['approved', 'borrowed'] }, ...(excludingId ? { _id: { $ne: excludingId } } : {}), ...dates }).select('quantity startAt endAt').session(session).lean();
  const legacy = await BorrowRequest.find({ devices: deviceId, status: { $in: ['approved', 'borrowed'] }, ...dates }).select('startAt endAt').session(session).lean();
  return peakQuantity([...bookings, ...legacy.map(item => ({ ...item, quantity: 1 }))], start, end);
}
