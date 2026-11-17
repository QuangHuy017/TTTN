import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Device from '../src/models/Device.js';
import Category from '../src/models/Category.js';
import RentalRequest from '../src/models/RentalRequest.js';
import BorrowRequest from '../src/models/BorrowRequest.js';
import { signAccessToken } from '../src/utils/token.js';
import { env } from '../src/config/env.js';
env.jwtSecret = 'staff-permissions-test-only-12345678901234567890';
const id = '507f1f77bcf86cd799439011';
const staff = { _id: id, fullName: 'Staff', role: 'staff', isActive: true };
const auth = call => call.set('Authorization', `Bearer ${signAccessToken(staff)}`);
const body = { name: 'Laptop', assetCode: 'TEST', category: id, status: 'available', rentalPricePerDay: 100000 };
const chain = data => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => data });
test('staff can list, create, edit and delete devices, and access image uploads', async t => {
  t.mock.method(User, 'findById', async () => staff);
  t.mock.method(Category, 'exists', async () => ({ _id: id }));
  t.mock.method(Device, 'find', () => chain([{ _id: id, ...body }]));
  t.mock.method(Device, 'countDocuments', async () => 1);
  t.mock.method(Device, 'create', async data => ({ _id: id, ...data }));
  t.mock.method(Device, 'findOneAndUpdate', async () => ({ _id: id, ...body }));
  t.mock.method(Device, 'findById', async () => ({ _id: id, ...body }));
  t.mock.method(RentalRequest, 'exists', async () => null);
  t.mock.method(BorrowRequest, 'exists', async () => null);
  assert.equal((await auth(request(app).get('/api/v1/admin/devices'))).status, 200);
  assert.equal((await auth(request(app).post('/api/v1/admin/devices')).send(body)).status, 201);
  assert.equal((await auth(request(app).patch(`/api/v1/admin/devices/${id}`)).send(body)).status, 200);
  assert.equal((await auth(request(app).delete(`/api/v1/admin/devices/${id}`))).status, 200);
  // Upload permission passes; invalid bytes are rejected by upload validation.
  assert.equal((await auth(request(app).post('/api/v1/admin/device-images')).set('Content-Type', 'image/png').send(Buffer.from('not an image'))).status, 400);
});
test('staff can receive and process rental requests; validation still enforces workflow', async t => {
  t.mock.method(User, 'findById', async () => staff);
  t.mock.method(RentalRequest, 'find', () => chain([]));
  t.mock.method(RentalRequest, 'countDocuments', async () => 0);
  t.mock.method(mongoose.connection, 'transaction', async callback => callback({}));
  t.mock.method(RentalRequest, 'findById', () => ({ session: async () => null }));
  assert.equal((await auth(request(app).get('/api/v1/admin/requests'))).status, 200);
  for (const action of ['approve', 'reject', 'handover', 'return']) assert.equal((await auth(request(app).patch(`/api/v1/admin/requests/${id}/${action}`)).send({})).status, 404);
});
test('staff cannot access account/employee management or elevate privileges', async t => {
  t.mock.method(User, 'findById', async () => staff);
  for (const [method, path] of [['get', '/admin/users'], ['get', '/admin/overview'], ['get', '/admin/staff'], ['post', '/admin/staff'], ['patch', `/admin/staff/${id}`], ['delete', `/admin/staff/${id}`], ['post', '/users']]) assert.equal((await auth(request(app)[method](`/api/v1${path}`)).send({ role: 'admin' })).status, 403);
});
