import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { specificationRows } from '../../utils/device-specifications.js';
import '../../styles/specifications.css';

function SpecsTable({ rows }) {
  return <div className="technical-table-wrap"><table className="technical-table detail-specs" aria-label="Thông số kỹ thuật thiết bị"><tbody>{rows.map(row => <tr key={row.key}><th scope="row">{row.label}</th><td className={!row.value ? 'technical-pending' : undefined}>{row.value || 'Đang cập nhật'}</td></tr>)}</tbody></table></div>;
}
export default function TechnicalSpecs({ device }) {
  const [expanded, setExpanded] = useState(false);
  const rows = specificationRows(device.specifications, device.category?.name || '');
  return <section className="technical-specifications"><header><h2>Thông số kỹ thuật</h2><button type="button" onClick={() => setExpanded(true)}>Xem tất cả <ChevronRight size={15} /></button></header><SpecsTable rows={rows.slice(0, 10)} />{expanded && <Modal title="Thông số kỹ thuật đầy đủ" onClose={() => setExpanded(false)}><p className="technical-device-name">{device.name}</p><SpecsTable rows={[...rows, { key: 'assetCode', label: 'Mã tài sản', value: device.assetCode }, { key: 'condition', label: 'Tình trạng thiết bị', value: device.condition }]} /></Modal>}</section>;
}
