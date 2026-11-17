import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { parseDeviceQuery } from '../src/validators/device-query.js';
import app from '../src/app.js';
import Device from '../src/models/Device.js';

test('filters combine search, category, price and multiple configuration fields', () => {
  const result = parseDeviceQuery({ q: 'PC.*', category: '507f1f77bcf86cd799439011', minPrice: '0', maxPrice: '200000', 'spec.RAM': '16 GB', 'spec.CPU': 'i5', page: '2', limit: '5', sort: 'price_asc' });
  assert.equal(result.filter.$or[0].name.$regex, 'PC\\.\\*');
  assert.deepEqual(result.filter.rentalPricePerDay, { $gte: 0, $lte: 200000 });
  assert.equal(result.filter['specifications.RAM'].$regex, '16 GB');
  assert.equal(result.filter['specifications.CPU'].$regex, 'i5');
  assert.equal(result.filter.category, '507f1f77bcf86cd799439011');
  assert.equal(result.page, 2);
  assert.equal(result.limit, 5);
});

test('defaults and general configuration search handle missing specs and literal regex', () => {
  const result = parseDeviceQuery({ configuration: '512.*' });
  assert.equal(result.page, 1);
  assert.equal(result.limit, 12);
  const map = result.filter.$expr.$anyElementTrue[0].$map;
  assert.deepEqual(map.input.$objectToArray.$ifNull, ['$specifications', {}]);
  assert.equal(map.in.$regexMatch.regex, '512\\.\\*');
});

test('availability filter accepts domain statuses and rejects unknown values', () => {
  assert.equal(parseDeviceQuery({ status: 'available' }).filter.status, 'available');
  assert.throws(() => parseDeviceQuery({ status: 'invalid' }), error => error.status === 400);
});

test('HTTP rejects invalid, repeated, operator and oversized filters before accessing database', async () => {
  const invalid = ['page=0', 'page=1.5', 'limit=101', 'minPrice=-1', 'minPrice=20&maxPrice=10', 'category=invalid', 'sort=__proto__', 'q=a&q=b', '$where=anything', 'spec.$where=x', 'q=', `q=${'a'.repeat(201)}`];
  for (const query of invalid) {
    const response = await request(app).get(`/api/v1/devices?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(typeof response.body.message, 'string');
  }
});

test('HTTP returns paginated catalog, applies sort and skip, and excludes internal fields', async t => {
  const calls = {};
  const chain = {};
  for (const method of ['select', 'populate', 'sort', 'skip', 'limit']) {
    chain[method] = (...args) => { calls[method] = args; return chain; };
  }
  chain.lean = async () => [{ name: 'Demo', rentalPricePerDay: 150000 }];
  t.mock.method(Device, 'find', filter => { calls.filter = filter; return chain; });
  t.mock.method(Device, 'countDocuments', async () => 11);
  const response = await request(app).get('/api/v1/devices?page=2&limit=5&sort=price_desc&maxPrice=200000');
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].name, 'Demo');
  assert.deepEqual(response.body.pagination, { page: 2, limit: 5, total: 11, totalPages: 3, hasNextPage: true, hasPreviousPage: true });
  assert.deepEqual(calls.skip, [5]);
  assert.deepEqual(calls.sort, [{ rentalPricePerDay: -1, _id: 1 }]);
  assert.equal(calls.select[0].includes('location'), false);
  assert.deepEqual(calls.filter.isPublished, { $ne: false });
  assert.equal(calls.filter.deletedAt, null);
  assert.equal(calls.select[0].includes('images'), true);
});

test('empty catalog returns zero pages', async t => {
  const chain = {};
  for (const method of ['select', 'populate', 'sort', 'skip', 'limit']) chain[method] = () => chain;
  chain.lean = async () => [];
  t.mock.method(Device, 'find', () => chain);
  t.mock.method(Device, 'countDocuments', async () => 0);
  const response = await request(app).get('/api/v1/devices');
  assert.deepEqual(response.body.data, []);
  assert.equal(response.body.pagination.totalPages, 0);
  assert.equal(response.body.pagination.hasNextPage, false);
});
