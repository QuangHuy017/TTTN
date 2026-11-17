import mongoose from 'mongoose';
import { DEVICE_STATUSES } from '../constants/domain.js';

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sorts = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { rentalPricePerDay: 1, _id: 1 },
  price_desc: { rentalPricePerDay: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
};

export function parseDeviceQuery(query) {
  const allowed = new Set(['q', 'category', 'categoryName', 'configuration', 'minPrice', 'maxPrice', 'page', 'limit', 'sort', 'status']);
  for (const [key, value] of Object.entries(query)) {
    if (!allowed.has(key) && !/^spec\.[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key)) invalid(`Unsupported filter: ${key}`);
    if (typeof value !== 'string' || !value.trim() || value.length > 200) invalid(`Invalid value: ${key}`);
  }
  function integer(key, fallback, min, max) {
    if (query[key] === undefined) return fallback;
    if (!/^\d+$/.test(query[key])) invalid(`${key} must be an integer`);
    const value = Number(query[key]);
    if (!Number.isSafeInteger(value) || value < min || value > max) invalid(`${key} is out of range`);
    return value;
  }
  const page = integer('page', 1, 1, 100000);
  const limit = integer('limit', 12, 1, 100);
  const minPrice = integer('minPrice', undefined, 0, Number.MAX_SAFE_INTEGER);
  const maxPrice = integer('maxPrice', undefined, 0, Number.MAX_SAFE_INTEGER);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) invalid('minPrice must not exceed maxPrice');
  if (query.category && !mongoose.isObjectIdOrHexString(query.category)) invalid('Invalid category ID');
  const sort = query.sort || 'newest';
  if (!Object.hasOwn(sorts, sort)) invalid('Invalid sort');
  const filter = {};
  if (query.status) {
    if (!DEVICE_STATUSES.includes(query.status)) invalid('Invalid status');
    filter.status = query.status;
  }
  if (query.q) {
    const regex = { $regex: escapeRegex(query.q.trim()), $options: 'i' };
    filter.$or = [{ name: regex }, { assetCode: regex }];
  }
  if (query.category) filter.category = query.category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.rentalPricePerDay = {};
    if (minPrice !== undefined) filter.rentalPricePerDay.$gte = minPrice;
    if (maxPrice !== undefined) filter.rentalPricePerDay.$lte = maxPrice;
  }
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('spec.')) filter[`specifications.${key.slice(5)}`] = { $regex: escapeRegex(value.trim()), $options: 'i' };
  }
  if (query.configuration) {
    filter.$expr = { $anyElementTrue: [{ $map: {
      input: { $objectToArray: { $ifNull: ['$specifications', {}] } },
      as: 'spec',
      in: { $regexMatch: { input: '$$spec.v', regex: escapeRegex(query.configuration.trim()), options: 'i' } },
    } }] };
  }
  return { filter, categoryName: query.categoryName?.trim(), sort: sorts[sort], page, limit };
}
