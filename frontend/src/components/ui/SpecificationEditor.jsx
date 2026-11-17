import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { specificationRows } from '../../utils/device-specifications.js';
import '../../styles/specifications.css';

export default function SpecificationEditor({ specifications, categoryName = '' }) {
  const [rows, setRows] = useState(() => specificationRows(specifications, categoryName).map((row, index) => ({ ...row, id: index })));
  const [nextId, setNextId] = useState(rows.length);
  useEffect(() => {
    setRows(previous => {
      const entered = Object.fromEntries(previous.filter(row => row.key.trim() && row.value.trim()).map(row => [row.key, row.value]));
      return specificationRows(entered, categoryName).map((row, id) => ({ ...row, id }));
    });
  }, [categoryName]);
  return <section className="specification-editor"><header><div><h3>Thông số kỹ thuật{categoryName ? ` · ${categoryName}` : ''}</h3><p>Điền thông số của thiết bị. Có thể xuống dòng để nhập nhiều chi tiết; để trống nếu chưa có thông tin.</p><p>Khi đổi danh mục, thông số đã nhập được giữ lại để bạn kiểm tra.</p></div></header><div className="specification-editor-rows">{rows.map(row => <div key={`${categoryName}-${row.id}`} className="specification-editor-row"><div>{row.custom ? <><input aria-label={`Tên thông số ${row.id + 1}`} name={`spec-name-${row.id}`} value={row.key} onChange={event => setRows(previous => previous.map(item => item.id === row.id ? { ...item, key: event.target.value } : item))} maxLength={80} placeholder="Tên thông số" /><button type="button" aria-label={`Xóa thông số ${row.id + 1}`} onClick={() => setRows(previous => previous.filter(item => item.id !== row.id))}><X size={15} /></button></> : <><label htmlFor={`spec-value-${row.id}`}>{row.label}</label><input type="hidden" name={`spec-name-${row.id}`} value={row.key} /></>}</div><textarea id={`spec-value-${row.id}`} name={`spec-value-${row.id}`} aria-label={row.custom ? `Giá trị thông số ${row.id + 1}` : row.label} rows={row.key === 'GPU' || row.key === 'displayTechnology' || row.key === 'ports' ? 3 : 2} maxLength={1000} value={row.value} onChange={event => setRows(previous => previous.map(item => item.id === row.id ? { ...item, value: event.target.value } : item))} placeholder="Chưa cập nhật" /></div>)}</div><button type="button" className="adm-secondary" disabled={rows.length >= 50} onClick={() => { const id = Math.max(nextId, ...rows.map(row => row.id + 1), 0); setRows(previous => [...previous, { id, key: '', value: '', custom: true }]); setNextId(id + 1); }}><Plus size={15} />Thêm thông số khác</button></section>;
}
