import { useState } from 'react';
import { Check, Truck, PackageCheck, Eye, X } from 'lucide-react';
import Modal from './Modal.jsx';
import { apiRequest } from '../../services/api.js';

const actions = {
  approve: { label: 'Duyệt đơn', confirm: 'Xác nhận duyệt', note: 'Xác nhận thiết bị và lịch thuê phù hợp trước khi duyệt.', icon: Check },
  reject: { label: 'Từ chối', confirm: 'Xác nhận từ chối', note: 'Yêu cầu này sẽ chuyển sang trạng thái từ chối.', icon: X },
  handover: { label: 'Giao hàng', confirm: 'Xác nhận đã giao hàng', note: 'Chỉ xác nhận sau khi đã bàn giao thiết bị cho khách. Đơn sẽ chuyển sang Đang thuê và thiết bị chuyển sang Đã cho thuê.', icon: Truck },
  return: { label: 'Nhận lại thiết bị', confirm: 'Xác nhận đã nhận lại', note: 'Kiểm tra thiết bị đã được trả đầy đủ. Đơn sẽ hoàn thành và thiết bị chuyển về Còn thiết bị.', icon: PackageCheck },
};
const allowed = { pending: ['approve', 'reject'], approved: ['handover', 'reject'], borrowed: ['return'] };
const statuses = { pending: 'Chờ duyệt', approved: 'Đã duyệt / Chờ giao', borrowed: 'Đang thuê', completed: 'Hoàn thành', rejected: 'Từ chối', cancelled: 'Đã hủy' };
const date = value => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
export default function RentalRequestActions({ request, onChanged }) {
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const current = actions[action];
  function open(key) { setError(''); setReason(''); setAction(key); }
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const token = sessionStorage.getItem('techrental-access-token');
      const result = await apiRequest(`/admin/requests/${request._id}/${action}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...(action === 'reject' ? { reason } : {}) }) });
      setAction(null); onChanged(result.data, `${current.label} thành công.`);
    } catch (err) { setError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : err.message); }
    finally { setBusy(false); }
  }
  return <><div className="adm-request-actions"><button className="adm-edit" onClick={() => open('view')}><Eye size={14} />Chi tiết</button>{(allowed[request.status] || []).map(key => { const Icon = actions[key].icon; return <button key={key} className={`adm-rental-action ${key}`} onClick={() => open(key)}><Icon size={14} />{actions[key].label}</button>; })}</div>{action && <Modal title={current?.label || 'Chi tiết yêu cầu thuê'} onClose={() => { if (!busy) setAction(null); }}><div className="adm-request-modal"><p className="adm-request-code">#{request._id.slice(-8).toUpperCase()} · {statuses[request.status]}</p><dl>{[
    ['Thiết bị', request.device?.name || 'Không còn trong danh mục'], ['Mã tài sản', request.device?.assetCode], ['Số lượng', request.quantity],
    ['Người nhận', request.contact?.name], ['Điện thoại', request.contact?.phone], ['Email', request.contact?.email], ['Địa chỉ giao', request.contact?.address],
    ['Thời gian thuê', `${date(request.startAt)} – ${date(request.endAt)}`], ['Tiền thuê', new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(request.rentalAmount || 0)],
    ['Ghi chú', request.notes || 'Không có'], ...(request.handedOverAt ? [['Ngày giao', date(request.handedOverAt)]] : []), ...(request.returnedAt ? [['Ngày nhận lại', date(request.returnedAt)]] : []), ...(request.rejectionReason ? [['Lý do từ chối', request.rejectionReason]] : []),
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? '—'}</dd></div>)}</dl>{current ? <form onSubmit={submit}><p className="adm-request-note">{current.note}</p>{action === 'reject' && <label className="adm-request-reason">Lý do từ chối<textarea maxLength={1000} rows={3} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} placeholder="Nhập lý do để lưu cùng yêu cầu" /></label>}{error && <p className="adm-error" role="alert">{error}</p>}<div className="adm-dialog-actions"><button type="button" className="adm-secondary" disabled={busy} onClick={() => setAction(null)}>Đóng</button><button className={action === 'reject' ? 'adm-danger' : 'adm-primary'} disabled={busy}>{busy ? 'Đang xử lý…' : current.confirm}</button></div></form> : <div className="adm-dialog-actions"><button className="adm-secondary" onClick={() => setAction(null)}>Đóng</button></div>}</div></Modal>}</>;
}
