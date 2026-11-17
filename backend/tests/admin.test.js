import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Device from '../src/models/Device.js';
import Category from '../src/models/Category.js';
import RentalRequest from '../src/models/RentalRequest.js';
import BorrowRequest from '../src/models/BorrowRequest.js';
import { env } from '../src/config/env.js';
import { signAccessToken } from '../src/utils/token.js';
import { parseDevice } from '../src/routes/admin.routes.js';
env.jwtSecret = 'admin-tests-secret-12345678901234567890';
const id = '507f1f77bcf86cd799439011';
const input = { name: 'Laptop', assetCode: 'LT-01', category: id, status: 'available', rentalPricePerDay: 150000, depositAmount: 2000000 };

test('management endpoints reject missing credentials and renter roles', async t => {
  const user = { _id: id, role: 'renter', isActive: true };
  t.mock.method(User, 'findById', async () => user);
  for (const role of [null, 'renter']) {
    user.role = role;
    for (const [method, path] of [['get', '/overview'], ['get', '/devices'], ['get', '/users'], ['get', '/requests'], ['post', '/devices'], ['patch', `/devices/${id}`], ['delete', `/devices/${id}`], ['patch', `/requests/${id}/approve`], ['patch', `/requests/${id}/handover`], ['patch', `/requests/${id}/return`]]) {
      const call = request(app)[method](`/api/v1/admin${path}`);
      if (role) call.set('Authorization', `Bearer ${signAccessToken(user)}`);
      assert.equal((await call.send(input)).status, role ? 403 : 401);
    }
  }
});
test('deleting devices validates ids, blocks active rentals and preserves historical records', async t => {
  const user = { _id: id, role: 'admin', isActive: true };
  t.mock.method(User, 'findById', async () => user);
  let device = { _id: id, status: 'available' };
  let activeRental = null, activeBorrow = null;
  t.mock.method(Device, 'findById', async () => device);
  const rental = t.mock.method(RentalRequest, 'exists', async () => activeRental);
  t.mock.method(BorrowRequest, 'exists', async () => activeBorrow);
  const update = t.mock.method(Device, 'findOneAndUpdate', async () => ({ _id: id }));
  const remove = (deviceId = id) => request(app).delete(`/api/v1/admin/devices/${deviceId}`).set('Authorization', `Bearer ${signAccessToken(user)}`);
  assert.equal((await remove('invalid')).status, 400);
  device.status = 'borrowed';
  assert.equal((await remove()).status, 409);
  device.status = 'available'; activeRental = { _id: id };
  assert.equal((await remove()).status, 409);
  activeRental = null; activeBorrow = { _id: id };
  assert.equal((await remove()).status, 409);
  assert.equal(update.mock.calls.length, 0);
  activeBorrow = null;
  assert.equal((await remove()).status, 200);
  assert.equal(update.mock.calls[0].arguments[1].$set.isPublished, false);
  assert.ok(update.mock.calls[0].arguments[1].$set.deletedAt instanceof Date);
  assert.deepEqual(rental.mock.calls[0].arguments[0].status.$in, ['pending', 'approved', 'borrowed']);
  device.deletedAt = new Date();
  assert.equal((await remove()).status, 404);
  device = null;
  assert.equal((await remove()).status, 404);
});
test('device validation rejects injected objects, invalid enums and negative or fractional prices', () => {
  for (const change of [{ name: { $ne: null } }, { category: 'invalid' }, { status: 'invented' }, { rentalPricePerDay: -1 }, { depositAmount: 0.5 }]) {
    assert.throws(() => parseDevice({ ...input, ...change }), error => error.status === 400);
  }
  assert.equal(parseDevice({ ...input, role: 'admin' }).role, undefined);
});
test('drafts preserve missing prices; publishing requires a price and description is validated', () => {
  const draft = parseDevice({ ...input, isPublished: false, rentalPricePerDay: null, depositAmount: null, description: '' });
  assert.equal(draft.rentalPricePerDay, null);
  assert.equal(draft.isPublished, false);
  assert.throws(() => parseDevice({ ...input, isPublished: true, rentalPricePerDay: null }), error => error.status === 400);
  assert.throws(() => parseDevice({ ...input, description: 'a'.repeat(10001) }), error => error.status === 400);
  assert.throws(() => parseDevice({ ...input, isPublished: 'false' }), error => error.status === 400);
});
test('specifications accept multiline values and reject unsafe keys, duplicate names and invalid types', () => {
  const parsed = parseDevice({ ...input, specifications: { GPU: 'GPU 10 lõi\nNeural Engine 16 lõi', RAM: ' 16GB ', empty: '' } });
  assert.deepEqual(parsed.specifications, { GPU: 'GPU 10 lõi\nNeural Engine 16 lõi', RAM: '16GB' });
  for (const specifications of [null, [], { RAM: 16 }, { 'spec.$where': 'x' }, { constructor: 'x' }, { RAM: 'x'.repeat(1001) }, { RAM: '16GB', ' RAM ': '32GB' }]) {
    assert.throws(() => parseDevice({ ...input, specifications }), error => error.status === 400);
  }
  assert.deepEqual(parseDevice({ ...input, specifications: {} }).specifications, {});
});
test('admin can create and edit devices; duplicates and missing categories are handled', async t => {
  const user = { _id: id, role: 'admin', isActive: true };
  t.mock.method(User, 'findById', async () => user);
  const category = t.mock.method(Category, 'exists', async () => ({ _id: id }));
  const create = t.mock.method(Device, 'create', async data => ({ _id: id, ...data }));
  t.mock.method(Device, 'findOneAndUpdate', async (filter, update) => ({ _id: filter._id, ...update.$set }));
  const call = (method, path = '') => request(app)[method](`/api/v1/admin/devices${path}`).set('Authorization', `Bearer ${signAccessToken(user)}`).send(input);
  assert.equal((await call('post')).status, 201);
  const updated = await call('patch', `/${id}`);
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.assetCode, input.assetCode);
  create.mock.mockImplementation(async () => { const error = new Error(); error.code = 11000; throw error; });
  assert.equal((await call('post')).status, 409);
  category.mock.mockImplementation(async () => null);
  assert.equal((await call('post')).status, 400);
});
