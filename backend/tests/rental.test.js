import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import Device from '../src/models/Device.js';
import RentalRequest from '../src/models/RentalRequest.js';
import { parseRentalRequest } from '../src/routes/rental.routes.js';
import User from '../src/models/User.js';
import { env } from '../src/config/env.js';
import { signAccessToken } from '../src/utils/token.js';

const payload = { deviceId: '507f1f77bcf86cd799439011', quantity: 3, name: 'Nguyễn Văn An', phone: '0988123456', email: 'an@example.com', address: '12 Nguyễn Huệ', start: '2099-01-01', end: '2099-01-06', notes: 'Cần cài phần mềm' };
test('rental request validates quantity, contact and date bounds', () => {
  assert.equal(parseRentalRequest(payload).quantity, 3);
  for (const quantity of [0, -1, 1.5, 101, '3']) assert.throws(() => parseRentalRequest({ ...payload, quantity }), { status: 400 });
  for (const changes of [{ end: payload.start }, { start: '2020-01-01' }, { start: '2099-02-30' }, { phone: 'abc' }, { email: 'bad' }]) assert.throws(() => parseRentalRequest({ ...payload, ...changes }), { status: 400 });
});
test('rental API stores pending quantity and calculates totals from database prices', async () => {
  const originalFind = Device.findById, originalCreate = RentalRequest.create;
  let saved;
  Device.findById = async () => ({ status: 'available', stockQuantity: 10, rentalPricePerDay: 120000, depositAmount: 1000000 });
  RentalRequest.create = async value => { saved = value; return { ...value, _id: 'request-001', status: 'pending' }; };
  try {
    const response = await request(app).post('/api/v1/rental-requests').send({ ...payload, rentalAmount: 1, status: 'approved' });
    assert.equal(response.status, 201);
    assert.equal(saved.quantity, 3);
    assert.equal(saved.rentalAmount, 1800000);
    assert.equal(saved.depositAmount, 3000000);
    assert.equal(saved.status, undefined);
    assert.equal(response.body.data.status, 'pending');
    Device.findById = async () => ({ status: 'maintenance' });
    assert.equal((await request(app).post('/api/v1/rental-requests').send(payload)).status, 409);
  } finally { Device.findById = originalFind; RentalRequest.create = originalCreate; }
});

test('private rental endpoints require authentication and scope queries to the current owner', async t => {
  assert.equal((await request(app).get('/api/v1/rental-requests/mine')).status, 401);
  assert.equal((await request(app).patch(`/api/v1/rental-requests/${payload.deviceId}/cancel`)).status, 401);
  env.jwtSecret = 'test-only-rental-management-secret-1234567890';
  const account = { _id: '507f1f77bcf86cd799439022', isActive: true, role: 'renter' };
  t.mock.method(User, 'findById', async () => account);
  const token = signAccessToken(account);
  let listCriteria, cancelCriteria;
  const query = { populate() { return this; }, sort() { return this; }, async lean() { return []; } };
  t.mock.method(RentalRequest, 'find', criteria => { listCriteria = criteria; return query; });
  t.mock.method(RentalRequest, 'findOneAndUpdate', async criteria => { cancelCriteria = criteria; return null; });
  const list = await request(app).get('/api/v1/rental-requests/mine?borrower=someone-else').set('Authorization', `Bearer ${token}`);
  assert.equal(list.status, 200);
  assert.deepEqual(listCriteria, { borrower: account._id });
  const cancel = await request(app).patch(`/api/v1/rental-requests/${payload.deviceId}/cancel`).set('Authorization', `Bearer ${token}`);
  assert.equal(cancel.status, 409);
  assert.deepEqual(cancelCriteria, { _id: payload.deviceId, borrower: account._id, status: 'pending' });
});

test('authenticated rental creation records the verified user instead of a client supplied owner', async t => {
  env.jwtSecret = 'test-only-rental-management-secret-1234567890';
  const account = { _id: '507f1f77bcf86cd799439022', isActive: true, role: 'renter' };
  t.mock.method(User, 'findById', async () => account);
  t.mock.method(Device, 'findById', async () => ({ status: 'available', stockQuantity: 10, rentalPricePerDay: 120000, depositAmount: 1000000 }));
  let saved;
  t.mock.method(RentalRequest, 'create', async value => { saved = value; return { ...value, _id: payload.deviceId, status: 'pending' }; });
  const response = await request(app).post('/api/v1/rental-requests').set('Authorization', `Bearer ${signAccessToken(account)}`).send({ ...payload, borrower: 'someone-else' });
  assert.equal(response.status, 201);
  assert.equal(saved.borrower, account._id);
});
