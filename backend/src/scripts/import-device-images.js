import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import '../config/env.js';
import { connectDatabase } from '../config/database.js';
import Device from '../models/Device.js';
import Category from '../models/Category.js';
import { cloudConfig, uploadBuffer } from '../services/image.service.js';

const supported = new Map([['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'], ['.webp', 'image/webp'], ['.gif', 'image/gif'], ['.avif', 'image/avif']]);
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function discover(source) {
  const groups = [];
  async function imagesIn(directory) {
    const files = [];
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await imagesIn(target));
      else if (entry.isFile() && supported.has(path.extname(entry.name).toLowerCase())) files.push(target);
    }
    return files;
  }
  for (const entry of (await readdir(source, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (entry.isDirectory()) {
      const files = await imagesIn(path.join(source, entry.name));
      if (files.length) groups.push({ name: entry.name, assetCode: `IMPORT-${digest(entry.name.normalize('NFC')).slice(0, 16).toUpperCase()}`, files });
    } else if (entry.isFile() && supported.has(path.extname(entry.name).toLowerCase())) {
      const name = path.basename(entry.name, path.extname(entry.name));
      groups.push({ name, assetCode: `IMPORT-${digest(entry.name.normalize('NFC')).slice(0, 16).toUpperCase()}`, files: [path.join(source, entry.name)] });
    }
  }
  return groups;
}
export async function uploadImage(file, config) {
  return uploadBuffer(await readFile(file), path.basename(file), supported.get(path.extname(file).toLowerCase()), config);
}
async function main() {
  const sourceArg = process.argv.find(argument => argument.startsWith('--source='));
  if (!sourceArg) throw new Error('Cần --source=<thư mục ảnh>. Thêm --apply để upload và ghi MongoDB.');
  const source = path.resolve(sourceArg.slice('--source='.length));
  const groups = await discover(source);
  if (!groups.length) throw new Error('Không tìm thấy ảnh hỗ trợ trong thư mục.');
  const imageCount = groups.reduce((sum, group) => sum + group.files.length, 0);
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', devices: groups.length, images: imageCount, groups: groups.map(({ name, assetCode, files }) => ({ name, assetCode, images: files.length })) }));
  if (!process.argv.includes('--apply')) return;
  const config = cloudConfig();
  await connectDatabase(); await Device.init();
  const category = await Category.findOneAndUpdate({ name: 'Máy tính' }, { $setOnInsert: { name: 'Máy tính' } }, { upsert: true, new: true });
  const report = { source, startedAt: new Date().toISOString(), devices: [], failed: [] };
  const reportDirectory = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)), 'reports');
  await mkdir(reportDirectory, { recursive: true });
  const reportPath = path.join(reportDirectory, 'device-image-import.json');
  // Two folders at a time; a folder is persisted only after every image uploads.
  const queue = [...groups];
  async function worker() {
    while (queue.length) {
      const group = queue.shift();
      try {
        const images = [];
        for (const file of group.files) {
          images.push(await uploadImage(file, config));
          console.log(JSON.stringify({ uploaded: path.relative(source, file) }));
        }
        const device = await Device.findOneAndUpdate({ assetCode: group.assetCode }, {
          $set: { images },
          $setOnInsert: { name: group.name, category: category._id, isPublished: false, status: 'available', description: '', rentalPricePerDay: null, depositAmount: null },
        }, { upsert: true, new: true, runValidators: true });
        report.devices.push({ id: String(device._id), name: device.name, assetCode: device.assetCode, images: images.length });
        console.log(JSON.stringify({ saved: device.name, images: images.length }));
      } catch (error) { report.failed.push({ name: group.name, error: error.message }); console.error(JSON.stringify({ failed: group.name, error: error.message })); }
    }
  }
  await Promise.all([worker(), worker()]);
  report.finishedAt = new Date().toISOString();
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ saved: report.devices.length, failed: report.failed.length, report: reportPath }));
  if (report.failed.length) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
}
