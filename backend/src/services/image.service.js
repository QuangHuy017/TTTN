import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../validators/auth.js';

export function cloudConfig() {
  if (process.env.CLOUDINARY_URL) {
    let url;
    try { url = new URL(process.env.CLOUDINARY_URL); } catch { fail(503, 'Cấu hình Cloudinary không hợp lệ.'); }
    if (url.protocol !== 'cloudinary:' || !url.username || !url.password || !url.hostname) fail(503, 'Cấu hình Cloudinary chưa đầy đủ.');
    return { cloud: url.hostname, key: decodeURIComponent(url.username), secret: decodeURIComponent(url.password) };
  }
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !key || !secret) fail(503, 'Chưa cấu hình Cloudinary.');
  return { cloud, key, secret };
}
export function imageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) return 'image/gif';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buffer.subarray(4, 8).toString() === 'ftyp' && ['avif', 'avis'].includes(buffer.subarray(8, 12).toString())) return 'image/avif';
  return null;
}
export async function uploadBuffer(content, filename, mime, config = cloudConfig()) {
  const publicId = `techrental/devices/${createHash('sha256').update(content).digest('hex')}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const form = new FormData();
    form.set('file', new Blob([content], { type: mime }), filename);
    form.set('public_id', publicId);
    form.set('overwrite', 'false');
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloud)}/image/upload`, {
        method: 'POST', body: form,
        headers: { Authorization: `Basic ${Buffer.from(`${config.key}:${config.secret}`).toString('base64')}` },
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < 2) continue;
        fail(502, `Không tải được ảnh lên Cloudinary (HTTP ${response.status}). Vui lòng thử lại.`);
      }
      const image = await response.json();
      if (!image.secure_url?.startsWith('https://res.cloudinary.com/') || image.public_id !== publicId) fail(502, 'Cloudinary trả về ảnh không hợp lệ.');
      return { url: image.secure_url, publicId: image.public_id, originalName: filename, width: image.width, height: image.height };
    } catch (error) {
      if (['TimeoutError', 'TypeError'].includes(error.name)) {
        if (attempt < 2) continue;
        fail(502, 'Không kết nối được Cloudinary. Vui lòng thử lại.');
      }
      throw error;
    }
  }
}
export function imageReceipt(image, userId) {
  return jwt.sign({ image }, env.jwtSecret, { subject: String(userId), issuer: 'equipment-rental-api', audience: 'equipment-rental-image', expiresIn: '24h' });
}
export function verifyImageReceipt(token, userId) {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { issuer: 'equipment-rental-api', audience: 'equipment-rental-image', subject: String(userId), algorithms: ['HS256'] });
    if (!payload.image?.url || !payload.image?.publicId) throw new Error();
    return payload.image;
  } catch { fail(400, 'Ảnh tải lên không hợp lệ hoặc đã hết hạn. Vui lòng chọn và tải lại ảnh.'); }
}
