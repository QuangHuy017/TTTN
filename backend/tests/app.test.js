import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import BorrowRequest from '../src/models/BorrowRequest.js';
import mongoose from 'mongoose';

test('health reports unavailable database without claiming success', async () => {
  const response = await request(app).get('/api/v1/health');
  assert.equal(response.status, 503);
  assert.equal(response.body.database, 'disconnected');
});
test('unknown API returns JSON 404', async () => {
  const response = await request(app).get('/api/v1/missing');
  assert.equal(response.status, 404);
  assert.equal(typeof response.body.message, 'string');
});
test('malformed JSON returns 400', async () => {
  const response = await request(app).post('/api/v1/missing').set('Content-Type', 'application/json').send('{');
  assert.equal(response.status, 400);
});
test('borrow request rejects reversed dates and duplicate physical devices', async () => {
  const device = new mongoose.Types.ObjectId();
  const doc = new BorrowRequest({ borrower: new mongoose.Types.ObjectId(), devices: [device, device], startAt: new Date('2026-11-10'), endAt: new Date('2026-11-09'), purpose: 'Study' });
  await assert.rejects(doc.validate(), error => Boolean(error.errors.endAt && error.errors.devices));
});

