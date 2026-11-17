import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { env } from '../src/config/env.js';
import { hashPassword, verifyPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/token.js';
import { authenticate, authorize } from '../src/middlewares/auth.middleware.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
env.jwtSecret = 'test-only-secret-not-for-production-1234567890';
const id = '507f1f77bcf86cd799439011';
const account = { _id: id, fullName: 'Test User', email: 'test@example.com', role: 'renter', isActive: true };

test('password hashing uses independent salts and verifies correctly', async () => {
  const first = await hashPassword('ExamplePass123');
  const second = await hashPassword('ExamplePass123');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('ExamplePass123', first), true);
  assert.equal(await verifyPassword('WrongPass123', first), false);
});
test('registration preserves original password, normalizes email and never returns credentials', async t => {
  let saved;
  t.mock.method(User, 'create', async data => { saved = data; return { ...account, ...data }; });
  const response = await request(app).post('/api/v1/auth/register').send({ fullName: 'Test User', email: 'TEST@EXAMPLE.COM', password: 'ExamplePass123' });
  assert.equal(response.status, 201);
  assert.equal(saved.role, 'renter');
  assert.equal(saved.email, 'test@example.com');
  assert.equal(saved.password, 'ExamplePass123');
  assert.equal(saved.passwordHash, undefined);
  assert.equal(response.body.user.password, undefined);
  assert.equal(response.body.user.passwordHash, undefined);
  assert.equal(jwt.decode(response.body.accessToken).sub, id);
});
test('registration rejects role injection and invalid input before database access', async () => {
  for (const data of [{ fullName: 'Test', email: 'test@example.com', password: 'ExamplePass123', role: 'admin' }, { email: { $ne: null }, password: 'ExamplePass123' }, { fullName: 'Test', email: 'test@example.com', password: 'short' }]) {
    assert.equal((await request(app).post('/api/v1/auth/register').send(data)).status, 400);
  }
});
test('duplicate registration returns 409', async t => {
  t.mock.method(User, 'create', async () => { const error = new Error(); error.code = 11000; throw error; });
  const response = await request(app).post('/api/v1/auth/register').send({ fullName: 'Test', email: 'test@example.com', password: 'ExamplePass123' });
  assert.equal(response.status, 409);
});
test('login accepts correct password and rejects wrong password or locked account', async t => {
  const user = { ...account, passwordHash: await hashPassword('ExamplePass123') };
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  const login = password => request(app).post('/api/v1/auth/login').send({ email: account.email, password });
  assert.equal((await login('ExamplePass123')).status, 200);
  assert.equal((await login('WrongPass123')).status, 401);
  user.isActive = false;
  assert.equal((await login('ExamplePass123')).status, 401);
});
test('plaintext login preserves spaces and rejects wrong passwords and disabled accounts', async t => {
  const user = { ...account, password: ' OriginalPass123 ' };
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  const login = password => request(app).post('/api/v1/auth/login').send({ email: account.email, password });
  const response = await login(user.password);
  assert.equal(response.status, 200);
  assert.equal(response.body.user.password, undefined);
  assert.equal(response.body.user.passwordHash, undefined);
  assert.equal((await login(user.password.trim())).status, 401);
  assert.equal((await login('WrongPassword123')).status, 401);
  user.isActive = false;
  assert.equal((await login(user.password)).status, 401);
});
test('missing, tampered and expired JWT are rejected', async () => {
  assert.equal((await request(app).get('/api/v1/auth/me')).status, 401);
  const expired = jwt.sign({}, env.jwtSecret, { subject: id, issuer: 'equipment-rental-api', audience: 'equipment-rental-web', expiresIn: -1 });
  for (const token of ['invalid', expired, `${signAccessToken(account)}broken`]) {
    assert.equal((await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status, 401);
  }
});
test('RBAC reads current role and account state from database on each request', async t => {
  let user = { ...account };
  t.mock.method(User, 'findById', async () => user);
  const token = signAccessToken(account);
  const demo = express();
  demo.get('/staff', authenticate, authorize('staff', 'admin'), (req, res) => res.json({ ok: true }));
  demo.use(errorHandler);
  const check = () => request(demo).get('/staff').set('Authorization', `Bearer ${token}`);
  assert.equal((await check()).status, 403);
  user.role = 'staff';
  assert.equal((await check()).status, 200);
  user.role = 'admin';
  assert.equal((await check()).status, 200);
  user.isActive = false;
  assert.equal((await check()).status, 401);
  user = null;
  assert.equal((await check()).status, 401);
});
test('only admin can provision accounts and no hash is returned', async t => {
  const user = { ...account };
  t.mock.method(User, 'findById', async () => user);
  const token = signAccessToken(user);
  const create = () => request(app).post('/api/v1/users').set('Authorization', `Bearer ${token}`).send({ fullName: 'Staff User', email: 'staff@example.com', password: 'ExamplePass123', role: 'staff' });
  assert.equal((await create()).status, 403);
  user.role = 'staff';
  assert.equal((await create()).status, 403);
  user.role = 'admin';
  t.mock.method(User, 'create', async data => ({ ...account, ...data }));
  const response = await create();
  assert.equal(response.status, 201);
  assert.equal(response.body.user.role, 'staff');
  assert.equal(response.body.user.password, undefined);
  assert.equal(response.body.user.passwordHash, undefined);
});
test('profile updates only the authenticated user name and never exposes passwords', async t => {
  assert.equal((await request(app).patch('/api/v1/auth/me').send({ fullName: 'New Name' })).status, 401);
  t.mock.method(User, 'findById', async () => ({ ...account }));
  const update = t.mock.method(User, 'findByIdAndUpdate', async (_id, changes) => ({ ...account, ...changes.$set, password: 'hidden-password', passwordHash: 'hidden-hash' }));
  const call = data => request(app).patch('/api/v1/auth/me').set('Authorization', `Bearer ${signAccessToken(account)}`).send(data);
  for (const data of [{ fullName: 'a' }, { fullName: 'Name', role: 'admin' }, { fullName: { $ne: null } }, { fullName: 'Name', email: 'another@example.com' }]) assert.equal((await call(data)).status, 400);
  const result = await call({ fullName: '  Updated Name  ' });
  assert.equal(result.status, 200);
  assert.equal(result.body.user.fullName, 'Updated Name');
  assert.equal(update.mock.calls[0].arguments[0], account._id);
  assert.deepEqual(update.mock.calls[0].arguments[1], { $set: { fullName: 'Updated Name' } });
  assert.equal(result.body.user.password, undefined);
  assert.equal(result.body.user.passwordHash, undefined);
});
