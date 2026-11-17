import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import RentalRequest from '../src/models/RentalRequest.js';
import BorrowRequest from '../src/models/BorrowRequest.js';
import Device from '../src/models/Device.js';
import Notification from '../src/models/Notification.js';
import { performRentalAction, validateRentalAction } from '../src/services/rental-workflow.service.js';

const id = '507f1f77bcf86cd799439011';
const assetId = '507f1f77bcf86cd799439012';
const input = { _id: id, device: assetId, status: 'pending', quantity: 1, startAt: new Date('2026-11-16'), endAt: new Date('2026-11-23') };
const asset = { _id: assetId, status: 'available', isPublished: true };
test('rental workflow only permits valid transitions and available physical assets', () => {
  assert.equal(validateRentalAction(input, asset, 'approve').to, 'approved');
  assert.equal(validateRentalAction({ ...input, status: 'approved' }, asset, 'handover').to, 'borrowed');
  assert.equal(validateRentalAction({ ...input, status: 'borrowed' }, { ...asset, status: 'borrowed' }, 'return').to, 'completed');
  assert.equal(validateRentalAction(input, null, 'reject').to, 'rejected');
  for (const [order, device, action] of [
    [input, asset, 'handover'], [input, asset, 'return'], [{ ...input, status: 'cancelled' }, asset, 'approve'],
    [{ ...input, quantity: 2 }, asset, 'approve'], [input, { ...asset, deletedAt: new Date() }, 'approve'],
    [input, { ...asset, isPublished: false }, 'approve'], [input, { ...asset, status: 'maintenance' }, 'approve'],
    [{ ...input, status: 'approved' }, { ...asset, status: 'borrowed' }, 'handover'],
  ]) assert.throws(() => validateRentalAction(order, device, action), error => error.status === 409);
});
test('approve, handover and return update request audit fields and device together in transactions', async t => {
  const request = { ...input, borrower: '507f1f77bcf86cd799439013' }, device = { ...asset };
  const session = { test: true };
  const transaction = t.mock.method(mongoose.connection, 'transaction', async callback => callback(session));
  const notification = t.mock.method(Notification, 'updateOne', async () => ({ upsertedCount: 1 }));
  t.mock.method(RentalRequest, 'findById', () => ({ session: async () => ({ ...request }) }));
  const lock = t.mock.method(Device, 'findOneAndUpdate', async () => ({ ...device }));
  const conflicts = t.mock.method(RentalRequest, 'find', () => ({ select() { return this; }, session() { return this; }, lean: async () => [] }));
  t.mock.method(BorrowRequest, 'find', () => ({ select() { return this; }, session() { return this; }, lean: async () => [] }));
  const update = t.mock.method(RentalRequest, 'findOneAndUpdate', async (_filter, changes, options) => { assert.equal(options.session, session); Object.assign(request, changes.$set); return { ...request }; });
  const availability = t.mock.method(Device, 'updateOne', async (filter, changes, options) => { assert.equal(options.session, session); assert.equal(filter.status, device.status); Object.assign(device, changes.$set); return { modifiedCount: 1 }; });
  const now = new Date('2026-11-16T08:00:00Z');
  assert.equal((await performRentalAction(id, 'approve', 'admin', '', now)).status, 'approved');
  assert.equal(device.status, 'available');
  assert.equal(request.reviewedBy, 'admin');
  assert.equal((await performRentalAction(id, 'handover', 'admin', '', now)).status, 'borrowed');
  assert.equal(device.status, 'borrowed');
  assert.equal(request.handedOverAt, now);
  assert.equal((await performRentalAction(id, 'return', 'admin', '', now)).status, 'completed');
  assert.equal(device.status, 'available');
  assert.equal(request.returnedBy, 'admin');
  assert.equal(transaction.mock.calls.length, 3);
  assert.deepEqual(lock.mock.calls[0].arguments[1], { $inc: { bookingVersion: 1 } });
  assert.deepEqual(conflicts.mock.calls[0].arguments[0].status.$in, ['approved', 'borrowed']);
  assert.equal(update.mock.calls[1].arguments[0].status, 'approved');
  assert.equal(availability.mock.calls.length, 2);
  assert.equal(notification.mock.calls.length, 1);
  assert.equal(notification.mock.calls[0].arguments[0].user, request.borrower);
  assert.equal(notification.mock.calls[0].arguments[2].session, session);
  assert.equal(notification.mock.calls[0].arguments[2].upsert, true);
});
test('overlapping bookings and stale state fail before committing a new request state', async t => {
  t.mock.method(mongoose.connection, 'transaction', async callback => callback({}));
  t.mock.method(RentalRequest, 'findById', () => ({ session: async () => ({ ...input }) }));
  t.mock.method(Device, 'findOneAndUpdate', async () => ({ ...asset }));
  t.mock.method(RentalRequest, 'find', () => ({ select() { return this; }, session() { return this; }, lean: async () => [{ quantity: 1, startAt: input.startAt, endAt: input.endAt }] }));
  t.mock.method(BorrowRequest, 'find', () => ({ select() { return this; }, session() { return this; }, lean: async () => [] }));
  const update = t.mock.method(RentalRequest, 'findOneAndUpdate', async () => null);
  await assert.rejects(performRentalAction(id, 'approve', 'admin'), error => error.status === 409);
  assert.equal(update.mock.calls.length, 0);
  await assert.rejects(performRentalAction('invalid', 'approve', 'admin'), error => error.status === 400);
  await assert.rejects(performRentalAction(id, 'unknown', 'admin'), error => error.status === 400);
});
test('reject works without a device and retains the reason and reviewer', async t => {
  t.mock.method(mongoose.connection, 'transaction', async callback => callback({}));
  t.mock.method(RentalRequest, 'findById', () => ({ session: async () => ({ ...input }) }));
  const update = t.mock.method(RentalRequest, 'findOneAndUpdate', async (_filter, changes) => ({ _id: id, ...changes.$set }));
  const result = await performRentalAction(id, 'reject', 'admin', ' Lịch không phù hợp ');
  assert.equal(result.status, 'rejected');
  assert.equal(update.mock.calls[0].arguments[1].$set.rejectionReason, 'Lịch không phù hợp');
});
