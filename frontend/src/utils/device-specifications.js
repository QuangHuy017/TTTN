export const specificationFields = [
  { key: 'GPU', label: 'Loại card đồ họa', aliases: ['gpu', 'graphics'] },
  { key: 'RAM', label: 'Dung lượng RAM', aliases: ['ram'] },
  { key: 'SSD', label: 'Ổ cứng', aliases: ['storage', 'ssd', 'HDD'] },
  { key: 'screenSize', label: 'Kích thước màn hình', aliases: ['screen'] },
  { key: 'displayTechnology', label: 'Công nghệ màn hình', aliases: ['display'] },
  { key: 'battery', label: 'Pin', aliases: [] },
  { key: 'operatingSystem', label: 'Hệ điều hành', aliases: ['OS', 'os'] },
  { key: 'resolution', label: 'Độ phân giải màn hình', aliases: [] },
  { key: 'CPU', label: 'Loại CPU', aliases: ['cpu', 'processor'] },
  { key: 'ports', label: 'Cổng giao tiếp', aliases: ['connection'] },
];
const field = (key, label, aliases = []) => ({ key, label, aliases });
export const specificationTemplates = {
  'Máy tính': specificationFields,
  'Máy chiếu': [
    field('resolution', 'Độ phân giải'), field('imageTechnology', 'Công nghệ hình ảnh'),
    field('screenSize', 'Kích thước màn hình phù hợp', ['screen']), field('audioTechnology', 'Công nghệ âm thanh'),
    field('operatingSystem', 'Hệ điều hành', ['OS', 'os']), field('features', 'Tính năng'),
    field('smartFeatures', 'Tính năng thông minh'), field('ports', 'Cổng kết nối', ['connection']),
    field('manufacturer', 'Hãng sản xuất', ['brand']), field('brightness', 'Độ sáng'),
    field('projectionTechnology', 'Công nghệ chiếu'), field('contrastRatio', 'Độ tương phản'),
  ],
  'Màn hình': [
    field('screenSize', 'Kích thước thực tế (bao gồm viền)', ['screen', 'Kích thước màn hình']),
    field('panel', 'Tấm nền', ['displayTechnology', 'display']), field('aspectRatio', 'Tỉ lệ màn hình'),
    field('refreshRate', 'Tần số quét'), field('responseTime', 'Thời gian phản hồi'), field('wallMount', 'Treo tường'),
    field('ports', 'Cổng kết nối', ['connection']), field('dimensions', 'Kích thước'), field('weight', 'Trọng lượng'),
    field('resolution', 'Độ phân giải màn hình'), field('brightness', 'Độ sáng'), field('colorGamut', 'Độ phủ màu'),
  ],
  'Máy in': [
    field('printerType', 'Loại máy in'), field('printTechnology', 'Công nghệ in'), field('functions', 'Chức năng'),
    field('resolution', 'Độ phân giải in'), field('printSpeed', 'Tốc độ in'), field('paperSize', 'Khổ giấy'),
    field('duplex', 'In hai mặt'), field('ports', 'Kết nối', ['connection']), field('paperCapacity', 'Khay giấy'),
    field('cartridge', 'Hộp mực'), field('dimensions', 'Kích thước'), field('weight', 'Trọng lượng'),
  ],
  'Máy chủ': [
    field('CPU', 'Bộ xử lý', ['cpu', 'processor']), field('RAM', 'Bộ nhớ RAM', ['ram']),
    field('SSD', 'Ổ cứng', ['storage', 'ssd', 'HDD']), field('driveBays', 'Khay ổ cứng'),
    field('raid', 'Bộ điều khiển RAID'), field('network', 'Kết nối mạng'), field('ports', 'Cổng kết nối', ['connection']),
    field('powerSupply', 'Nguồn điện'), field('formFactor', 'Kiểu máy / Kích thước rack'),
    field('operatingSystem', 'Hệ điều hành', ['OS', 'os']), field('management', 'Quản lý từ xa'),
  ],
};
export function fieldsForCategory(categoryName = '') {
  const name = categoryName.trim().toLocaleLowerCase('vi');
  if (['laptop', 'máy tính xách tay'].includes(name)) return specificationFields;
  return Object.entries(specificationTemplates).find(([label]) => label.toLocaleLowerCase('vi') === name)?.[1] || [];
}
export function specificationRows(specifications = {}, categoryName = 'Máy tính') {
  const used = new Set();
  const rows = fieldsForCategory(categoryName).map(field => {
    const key = [field.key, field.label, ...field.aliases].find(candidate => Object.hasOwn(specifications, candidate)) || field.key;
    used.add(key);
    return { key, label: field.label, value: specifications[key] || '', custom: false };
  });
  return [...rows, ...Object.entries(specifications).filter(([key]) => !used.has(key)).map(([key, value]) => ({ key, label: key, value, custom: true }))];
}
