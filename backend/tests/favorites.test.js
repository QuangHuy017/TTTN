import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Device from '../src/models/Device.js';
import Favorite from '../src/models/Favorite.js';
import { signAccessToken } from '../src/utils/token.js';
import { env } from '../src/config/env.js';
env.jwtSecret = 'favorites-test-only-secret-12345678901234567890';
const user = { _id: '507f1f77bcf86cd799439011', role: 'renter', isActive: true };
const deviceId = '507f1f77bcf86cd799439012';
const auth = call => call.set('Authorization', `Bearer ${signAccessToken(user)}`);
test('favorites require login for reads and writes', async () => {
  for (const [method, path] of [['get', ''], ['get', '/ids'], ['put', `/${deviceId}`], ['delete', `/${deviceId}`]]) {
    assert.equal((await request(app)[method](`/api/v1/favorites${path}`)).status, 401);
  }
});
test('save is owner scoped, ignores client owner and is idempotent', async t => {
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(Device, 'exists', async () => ({ _id: deviceId }));
  const update = t.mock.method(Favorite, 'updateOne', async () => ({ acknowledged: true }));
  const save = () => auth(request(app).put(`/api/v1/favorites/${deviceId}`)).send({ user: 'another-user' });
  assert.equal((await save()).status, 200);
  assert.equal((await save()).body.data.saved, true);
  assert.deepEqual(update.mock.calls[0].arguments[0], { user: user._id, device: deviceId });
  assert.equal(update.mock.calls[0].arguments[2].upsert, true);
  update.mock.mockImplementation(async () => { const error = new Error(); error.code = 11000; throw error; });
  assert.equal((await save()).status, 200);
});
test('invalid or missing devices are rejected and removal is scoped to current user', async t => {
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(Device, 'exists', async () => null);
  assert.equal((await auth(request(app).put('/api/v1/favorites/invalid'))).status, 400);
  assert.equal((await auth(request(app).put(`/api/v1/favorites/${deviceId}`))).status, 404);
  const remove = t.mock.method(Favorite, 'deleteOne', async () => ({ deletedCount: 0 }));
  assert.equal((await auth(request(app).delete(`/api/v1/favorites/${deviceId}`))).status, 200);
  assert.deepEqual(remove.mock.calls[0].arguments[0], { user: user._id, device: deviceId });
});
test('ids and list only read current user; removed devices are excluded', async t => {
  t.mock.method(User, 'findById', async () => user);
  const find = t.mock.method(Favorite, 'find', () => {
    const query = { sort: () => query, select: () => query, lean: async () => [{ device: deviceId }, { device: '507f1f77bcf86cd799439013' }] };
    return query;
  });
  t.mock.method(Device, 'find', () => {
    const query = { select: () => query, populate: () => query, lean: async () => [{ _id: deviceId, name: 'Laptop' }] };
    return query;
  });
  const ids = await auth(request(app).get('/api/v1/favorites/ids'));
  assert.equal(ids.body.data.length, 2);
  const list = await auth(request(app).get('/api/v1/favorites'));
  assert.equal(list.status, 200);
  assert.equal(list.body.pagination.total, 1);
  assert.equal(list.body.data[0]._id, deviceId);
  for (const call of find.mock.calls) assert.deepEqual(call.arguments[0], { user: user._id });
});
