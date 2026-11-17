import Category from '../models/Category.js';
import Device from '../models/Device.js';
import { withInventory } from './inventory.service.js';

export async function listDevices({ filter, categoryName, sort, page, limit }) {
  const criteria = { ...filter, isPublished: { $ne: false }, deletedAt: null };
  if (categoryName) {
    const escaped = categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const categories = await Category.find({ name: { $regex: `^${escaped}$`, $options: 'i' } }).select('_id').lean();
    const ids = categories.map(category => category._id);
    criteria.category = filter.category ? { $in: ids.filter(id => String(id) === filter.category) } : { $in: ids };
  }
  const [data, total] = await Promise.all([
    Device.find(criteria)
      .select('assetCode name category status condition specifications rentalPricePerDay depositAmount currency images description stockQuantity rentedQuantity')
      .populate('category', 'name description')
      .sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Device.countDocuments(criteria),
  ]);
  const totalPages = Math.ceil(total / limit);
  return { data: data.map(withInventory), pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && total > 0 } };
}

export function listCategories() {
  return Category.find().select('name description').sort({ name: 1, _id: 1 }).lean();
}
