import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Category from '../models/Category.js';
import Device from '../models/Device.js';
import { catalog, buildDevices } from './catalog.js';

try {
  await connectDatabase();
  // Tạo unique indexes trước khi thêm dữ liệu. Không xóa hay ghi đè dữ liệu cũ.
  await Promise.all([Category.init(), Device.init()]);
  let categoriesCreated = 0;
  let devicesCreated = 0;
  for (const item of catalog) {
    const result = await Category.updateOne(
      { name: item.name },
      { $setOnInsert: { name: item.name, description: item.description } },
      { upsert: true, runValidators: true, timestamps: false },
    );
    categoriesCreated += result.upsertedCount;
    const category = await Category.findOne({ name: item.name });
    for (const device of buildDevices(item, category._id)) {
      const document = new Device(device);
      await document.validate();
      const insert = await Device.updateOne(
        { assetCode: device.assetCode },
        { $setOnInsert: device },
        { upsert: true, runValidators: true, timestamps: false },
      );
      devicesCreated += insert.upsertedCount;
    }
  }
  console.log(`Đã thêm ${categoriesCreated} danh mục và ${devicesCreated} thiết bị mẫu.`);
  console.log('Các bản ghi đã tồn tại được giữ nguyên. Giá và tiền cọc là dữ liệu minh họa (VND).');
} catch (error) {
  // Không in URI hoặc thông tin xác thực trong lỗi kết nối.
  console.error(`Không thể tạo dữ liệu (${error.name}). Kiểm tra MONGODB_URI, quyền ghi và Atlas Network Access.`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
