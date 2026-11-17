// Giá minh họa phục vụ phát triển, không phải báo giá thị trường.
export const catalog = [
  { prefix: 'PC', name: 'Máy tính', description: 'Máy tính phục vụ học tập và làm việc', price: 150000, deposit: 2000000, specs: { CPU: 'Intel Core i5', RAM: '16 GB', SSD: '512 GB' } },
  { prefix: 'PJ', name: 'Máy chiếu', description: 'Máy chiếu phục vụ giảng dạy và sự kiện', price: 250000, deposit: 2000000, specs: { resolution: 'Full HD', brightness: '3500 lumen', connection: 'HDMI' } },
  { prefix: 'PR', name: 'Máy in', description: 'Máy in tài liệu văn phòng', price: 200000, deposit: 1500000, specs: { technology: 'Laser', paperSize: 'A4', duplex: 'Có' } },
  { prefix: 'SV', name: 'Máy chủ', description: 'Máy chủ vật lý phục vụ thử nghiệm và triển khai', price: 600000, deposit: 10000000, specs: { CPU: 'Intel Xeon', RAM: '64 GB', SSD: '2 TB' } },
  { prefix: 'MN', name: 'Màn hình', description: 'Màn hình máy tính', price: 100000, deposit: 1000000, specs: { size: '24 inch', resolution: 'Full HD', panel: 'IPS' } },
];

export function buildDevices(category, categoryId) {
  return Array.from({ length: 3 }, (_, index) => ({
    assetCode: `DEMO-${category.prefix}-${String(index + 1).padStart(3, '0')}`,
    name: `${category.name} mẫu ${index + 1}`,
    category: categoryId,
    status: 'available',
    location: 'Kho cho thuê chính',
    condition: 'Hoạt động tốt',
    rentalPricePerDay: category.price,
    depositAmount: category.deposit,
    currency: 'VND',
    specifications: category.specs,
  }));
}
