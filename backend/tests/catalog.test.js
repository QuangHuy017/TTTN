import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Device from '../src/models/Device.js';
import { catalog, buildDevices } from '../src/seeds/catalog.js';

test('rental catalog contains five categories and fifteen unique valid assets', async () => {
  assert.equal(catalog.length, 5);
  const devices = catalog.flatMap(item => buildDevices(item, new mongoose.Types.ObjectId()));
  assert.equal(devices.length, 15);
  assert.equal(new Set(devices.map(device => device.assetCode)).size, 15);
  for (const device of devices) await new Device(device).validate();
});

test('rental price and deposit cannot be negative', async () => {
  const [data] = buildDevices(catalog[0], new mongoose.Types.ObjectId());
  const device = new Device({ ...data, rentalPricePerDay: -1, depositAmount: -1 });
  await assert.rejects(device.validate(), error => Boolean(error.errors.rentalPricePerDay && error.errors.depositAmount));
});
