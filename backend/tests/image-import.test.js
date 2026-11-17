import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discover, digest, uploadImage } from '../src/scripts/import-device-images.js';

test('image import groups folders, skips HTML, and uses stable asset identifiers', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'techrental-images-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'Laptop A'));
  await writeFile(path.join(root, 'Laptop A', '01.webp'), 'test-image');
  await writeFile(path.join(root, 'Laptop A', '02.PNG'), 'another-image');
  await writeFile(path.join(root, 'Laptop A', 'page.html'), '<html/>');
  const first = await discover(root);
  const second = await discover(root);
  assert.equal(first.length, 1);
  assert.equal(first[0].files.length, 2);
  assert.equal(first[0].name, 'Laptop A');
  assert.equal(first[0].assetCode, second[0].assetCode);
});
test('Cloudinary upload uses stable content id and disables overwriting', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'techrental-images-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'photo.png');
  await writeFile(file, 'test-image');
  const publicId = `techrental/devices/${digest('test-image')}`;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.cloudinary.com/v1_1/test-cloud/image/upload');
    assert.equal(options.body.get('overwrite'), 'false');
    assert.equal(options.body.get('public_id'), publicId);
    return { ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/photo.png', public_id: publicId, width: 800, height: 600 }) };
  });
  const image = await uploadImage(file, { cloud: 'test-cloud', key: 'test-key', secret: 'test-secret' });
  assert.equal(image.publicId, publicId);
  assert.equal(image.originalName, 'photo.png');
});
