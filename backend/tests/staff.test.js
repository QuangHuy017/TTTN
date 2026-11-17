import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { env } from '../src/config/env.js';
import { signAccessToken } from '../src/utils/token.js';
import { parseStaff } from '../src/routes/staff.routes.js';
env.jwtSecret = 'staff-management-test-secret-12345678901234567890';
const admin = { _id: '507f1f77bcf86cd799439011', fullName: 'Admin', role: 'admin', isActive: true };
const staffId = '507f1f77bcf86cd799439012';
const input = { fullName: 'Nhân viên An', email: 'staff@example.com', phone: '0988123456', password: 'ExamplePassword123', isActive: true };
const auth = call => call.set('Authorization', `Bearer ${signAccessToken(admin)}`);
test('only admins can read, create, update or delete staff', async t => {
  let role = 'renter';
  t.mock.method(User, 'findById', async () => ({ ...admin, role }));
  for (const current of [null, 'renter', 'staff']) {
    role = current;
    for (const [method, path] of [['get', ''], ['post', ''], ['patch', `/${staffId}`], ['delete', `/${staffId}`]]) {
      const call = request(app)[method](`/api/v1/admin/staff${path}`);
      if (current) call.set('Authorization', `Bearer ${signAccessToken(admin)}`);
      assert.equal((await call.send(input)).status, current ? 403 : 401);
    }
  }
});
test('staff validation rejects privilege injection and invalid fields, optional edit password remains unchanged', () => {
  const result = parseStaff({ ...input, fullName: ' Staff ', email: ' STAFF@EXAMPLE.COM ' }, true);
  assert.equal(result.fullName, 'Staff'); assert.equal(result.email, 'staff@example.com');
  assert.deepEqual(parseStaff({ fullName: 'New Name', password: '' }), { fullName: 'New Name' });
  for (const data of [{ ...input, role: 'admin' }, { ...input, fullName: undefined }, { ...input, email: { $ne: null } }, { ...input, password: 'short' }, { ...input, phone: 'abc' }, { ...input, isActive: 'true' }, { ...input, deletedAt: null }]) assert.throws(() => parseStaff(data, true), error => error.status === 400);
});
test('create always assigns staff role, omits credentials from response and handles duplicate email', async t => {
  t.mock.method(User, 'findById', async () => admin);
  const create = t.mock.method(User, 'create', async data => ({ _id: staffId, ...data, passwordHash: 'hidden' }));
  const result = await auth(request(app).post('/api/v1/admin/staff')).send(input);
  assert.equal(result.status, 201); assert.equal(create.mock.calls[0].arguments[0].role, 'staff');
  assert.equal(result.body.data.password, undefined); assert.equal(result.body.data.passwordHash, undefined);
  create.mock.mockImplementation(async () => { const error = new Error(); error.code = 11000; throw error; });
  assert.equal((await auth(request(app).post('/api/v1/admin/staff')).send(input)).status, 409);
});
test('updates are scoped to staff and revoke sessions for password, email or account state changes', async t => {
  t.mock.method(User, 'findById', async () => admin);
  const find = t.mock.method(User, 'findOne', async () => ({ _id: staffId, ...input, role: 'staff' }));
  const update = t.mock.method(User, 'findOneAndUpdate', async (_filter, changes) => ({ _id: staffId, ...input, ...changes.$set, role: 'staff' }));
  const patch = body => auth(request(app).patch(`/api/v1/admin/staff/${staffId}`)).send(body);
  assert.equal((await patch({ fullName: 'Updated Name' })).status, 200);
  assert.equal(update.mock.calls[0].arguments[1].$inc, undefined);
  assert.equal((await patch({ password: 'NewPassword123' })).status, 200);
  assert.equal(update.mock.calls[1].arguments[1].$inc.tokenVersion, 1);
  assert.deepEqual(update.mock.calls[1].arguments[1].$unset, { passwordHash: '' });
  assert.equal((await patch({ email: 'new@example.com' })).status, 200);
  assert.equal(update.mock.calls[2].arguments[1].$inc.tokenVersion, 1);
  assert.equal((await patch({ isActive: false })).status, 200);
  assert.equal(update.mock.calls[3].arguments[1].$inc.tokenVersion, 1);
  assert.deepEqual(find.mock.calls[0].arguments[0], { _id: staffId, role: 'staff', deletedAt: null });
  find.mock.mockImplementation(async () => null);
  assert.equal((await patch({ fullName: 'Admin Account' })).status, 404);
});
test('delete removes staff from active listings and disables login while retaining record', async t => {
  t.mock.method(User, 'findById', async () => admin);
  const update = t.mock.method(User, 'findOneAndUpdate', async () => ({ _id: staffId }));
  assert.equal((await auth(request(app).delete(`/api/v1/admin/staff/${staffId}`))).status, 200);
  assert.deepEqual(update.mock.calls[0].arguments[0], { _id: staffId, role: 'staff', deletedAt: null });
  assert.equal(update.mock.calls[0].arguments[1].$set.isActive, false);
  assert.ok(update.mock.calls[0].arguments[1].$set.deletedAt instanceof Date);
  const query = {};
  const chain = { select: () => chain, sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => [{ _id: staffId, ...input, role: 'staff' }] };
  t.mock.method(User, 'find', filter => { Object.assign(query, filter); return chain; });
  t.mock.method(User, 'countDocuments', async () => 1);
  const list = await auth(request(app).get('/api/v1/admin/staff?q=An&active=true'));
  assert.equal(list.status, 200); assert.equal(query.role, 'staff'); assert.equal(query.deletedAt, null); assert.equal(query.isActive, true);
  assert.equal(list.body.data[0].password, undefined);
  update.mock.mockImplementation(async () => null);
  assert.equal((await auth(request(app).delete(`/api/v1/admin/staff/${staffId}`))).status, 404);
});
