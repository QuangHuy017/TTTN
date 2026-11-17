import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Download, Search, SlidersHorizontal, ClipboardList, Hourglass, Laptop, CircleCheck, MapPin, CalendarDays, ShieldCheck, ArrowRight, X, Eye } from 'lucide-react';
import StoreLayout from '../components/layout/StoreLayout.jsx';
import Modal from '../components/ui/Modal.jsx';
import { formatMoney } from '../components/catalog/DeviceCard.jsx';
import { apiRequest } from '../services/api.js';
import '../styles/home.css';
import '../styles/catalog.css';
import '../styles/rentals.css';

const statuses = { pending: 'Chờ duyệt', approved: 'Đã duyệt / Chờ giao', borrowed: 'Đang thuê', completed: 'Đã hoàn tất / Đã trả', cancelled: 'Đã hủy', rejected: 'Từ chối' };
const filters = [['all', 'Tất cả'], ['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt / Chờ giao'], ['borrowed', 'Đang thuê'], ['completed', 'Đã hoàn tất / Đã trả'], ['closed', 'Đã hủy / Từ chối']];
const date = value => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
const code = item => `TR-${item._id.slice(-8).toUpperCase()}`;
export default function MyRentalsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [login, setLogin] = useState(false);
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(null);
  const [cancelItem, setCancelItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const token = sessionStorage.getItem('techrental-access-token');
    setLoading(true); setError(''); setLogin(!token); setItems([]);
    if (!token) { setLoading(false); return; }
    apiRequest('/rental-requests/mine', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(result => setItems(result.data)).catch(err => { if (err.name !== 'AbortError') { if (err.status === 401) { sessionStorage.removeItem('techrental-access-token'); setLogin(true); } else setError('Chưa tải được yêu cầu thuê. Vui lòng thử lại.'); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const logout = () => { controller.abort(); setItems([]); setLogin(true); setLoading(false); setSelected(null); setCancelItem(null); };
    window.addEventListener('techrental-logout', logout);
    return () => { controller.abort(); window.removeEventListener('techrental-logout', logout); };
  }, [retry]);
  const count = key => items.filter(item => key === 'all' || (key === 'closed' ? ['cancelled', 'rejected'].includes(item.status) : item.status === key)).length;
  const shown = items.filter(item => {
    const term = search.trim().toLocaleLowerCase('vi');
    return (filter === 'all' || (filter === 'closed' ? ['cancelled', 'rejected'].includes(item.status) : item.status === filter)) && (!term || `${code(item)} ${item.device?.name || ''} ${item.device?.assetCode || ''}`.toLocaleLowerCase('vi').includes(term)) && (!from || item.startAt.slice(0, 10) >= from) && (!to || item.startAt.slice(0, 10) <= to);
  }).sort((a, b) => sort === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt));
  async function cancel() {
    setBusy(true); setActionError('');
    try {
      const token = sessionStorage.getItem('techrental-access-token');
      const result = await apiRequest(`/rental-requests/${cancelItem._id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      setItems(items.map(item => item._id === result.data._id ? { ...item, status: result.data.status } : item)); setCancelItem(null);
    } catch (err) { setActionError(err.status === 409 ? err.message : 'Chưa hủy được yêu cầu. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <StoreLayout><main className="rentals-page site-container"><div className="rentals-breadcrumb"><Link to="/">Trang chủ</Link> / Tài khoản khách hàng / <strong>Quản lý yêu cầu thuê</strong></div><header className="rentals-heading"><div><p className="rentals-eyebrow">TÀI KHOẢN KHÁCH HÀNG</p><h1>Quản lý yêu cầu thuê của tôi</h1><p>Theo dõi tiến độ xét duyệt, thời gian thuê và lịch sử thiết bị của bạn.</p></div><div className="rentals-heading-actions"><button className="button button-outline" disabled={!items.length} onClick={() => window.print()}><Download size={15} /> In / Lưu PDF</button><Link className="button" to="/thiet-bi"><Plus size={16} /> Tạo yêu cầu thuê mới</Link></div></header>
    {login ? <section className="rentals-empty"><ShieldCheck size={40} /><h2>Đăng nhập để xem yêu cầu thuê</h2><p>Các yêu cầu được gửi khi đăng nhập sẽ xuất hiện tại đây.</p><Link className="button" to="/dang-nhap">Đăng nhập</Link></section> : <>
    <section className="rental-statistics" aria-label="Thống kê yêu cầu">{[["all", 'Tổng số yêu cầu', 'Tất cả yêu cầu của bạn', ClipboardList], ['pending', 'Đang chờ duyệt', 'Chờ kiểm tra & xác nhận', Hourglass], ['borrowed', 'Đang sử dụng thiết bị', 'Đơn thuê đang hoạt động', Laptop], ['completed', 'Đã hoàn tất & Đã trả', 'Hoàn thành quá trình thuê', CircleCheck]].map(([key, title, caption, Symbol]) => <button key={key} className={`rental-stat ${key}`} onClick={() => setFilter(key)}><span>{title}</span><strong>{loading ? '—' : count(key)}</strong><small>{caption}</small><Symbol size={23} /></button>)}</section>
    <section className="rental-filters"><div className="rental-status-tabs" aria-label="Lọc theo trạng thái">{filters.map(([key, label]) => <button key={key} aria-pressed={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}<span>{count(key)}</span></button>)}</div><div className="rental-search-row"><label className="rental-search"><Search size={16} /><input aria-label="Tìm yêu cầu thuê" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo mã đơn, tên hoặc mã thiết bị…" /></label><label>Từ ngày<input aria-label="Từ ngày" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>Đến ngày<input aria-label="Đến ngày" type="date" min={from} value={to} onChange={e => setTo(e.target.value)} /></label><label className="rental-sort"><SlidersHorizontal size={14} /><select aria-label="Sắp xếp yêu cầu" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Mới nhất trước</option><option value="oldest">Cũ nhất trước</option></select></label></div>{from && to && from > to && <p className="rental-error">Ngày kết thúc phải từ ngày bắt đầu.</p>}</section>
    {loading ? <div className="rentals-empty" role="status">Đang tải yêu cầu thuê…</div> : error ? <div className="rentals-empty" role="alert"><h2>{error}</h2><button className="button" onClick={() => setRetry(retry + 1)}>Thử lại</button></div> : !shown.length ? <div className="rentals-empty"><ClipboardList size={40} /><h2>{items.length ? 'Không có yêu cầu phù hợp' : 'Bạn chưa có yêu cầu thuê nào'}</h2><p>{items.length ? 'Thử đổi từ khóa hoặc bộ lọc.' : 'Khám phá thiết bị và gửi yêu cầu thuê đầu tiên của bạn.'}</p><Link className="button" to="/thiet-bi">Khám phá thiết bị <ArrowRight size={15} /></Link></div> : <div className="rental-orders">{shown.map(item => <article key={item._id} className={`rental-order ${item.status}`}><header><strong>#{code(item)}</strong><span className={`rental-status ${item.status}`}>{statuses[item.status] || item.status}</span><small>Ngày gửi: {date(item.createdAt)}</small></header><div className="rental-order-body"><div><div className="rental-order-device"><span className="rental-device-icon"><Laptop size={28} /></span><div><h2>{item.quantity}× {item.device?.name || 'Thiết bị không còn trong danh mục'}</h2><div className="rental-spec-chips">{Object.entries(item.device?.specifications || {}).slice(0, 3).map(([key, value]) => <span key={key}>{key}: {value}</span>)}</div></div></div><div className="rental-order-meta"><span><CalendarDays size={14} /> {date(item.startAt)} – {date(item.endAt)} ({Math.round((new Date(item.endAt) - new Date(item.startAt)) / 86400000)} ngày)</span><span><MapPin size={14} /> {item.contact.address}</span></div>{item.notes && <p className="rental-order-notes">Ghi chú: {item.notes}</p>}</div><aside className="rental-order-price"><small>Tổng chi phí dự kiến (gồm tiền cọc)</small><strong>{formatMoney(item.rentalAmount + item.depositAmount)}<small> đ</small></strong><div><span>Tiền thuê</span><b>{formatMoney(item.rentalAmount)}đ</b></div><div><span>Tiền cọc tham khảo</span><b>{formatMoney(item.depositAmount)}đ</b></div><p><ShieldCheck size={14} /> Số lượng và lịch trống được xác nhận khi duyệt.</p></aside></div>{!['cancelled', 'rejected'].includes(item.status) && <div className="rental-progress" aria-label="Tiến trình đơn thuê">{['Gửi yêu cầu', 'Duyệt & Kiểm định', 'Bàn giao máy', 'Đang thuê', 'Hoàn tất'].map((label, index) => { const stage = { pending: 0, approved: 1, borrowed: 3, completed: 4 }[item.status] ?? 0; return <div key={label} className={index <= stage ? 'done' : ''}><span>{index <= stage ? <CheckMark /> : index + 1}</span><strong>{label}</strong><small>{index === stage ? 'Trạng thái hiện tại' : index < stage ? 'Đã qua bước này' : 'Chưa thực hiện'}</small></div>; })}</div>}<footer>{item.status === 'pending' && <button className="rental-cancel" onClick={() => { setCancelItem(item); setActionError(''); }}><X size={14} /> Hủy yêu cầu</button>}<button className="button button-outline" onClick={() => setSelected(item)}><Eye size={14} /> Xem chi tiết đơn</button>{item.status === 'completed' && item.device && <Link className="button" to={`/thiet-bi/${item.device._id}`}>Thuê lại cấu hình này</Link>}</footer></article>)}</div>}
    </>}
    <section className="rentals-support"><ShieldCheck size={25} /><div><h2>Cam kết dịch vụ & Hỗ trợ kỹ thuật</h2><p>Bạn có thể hủy miễn phí khi yêu cầu đang chờ duyệt. Kiểm tra cấu hình và tình trạng thiết bị trước khi ký biên bản bàn giao.</p><span>Thông tin rõ ràng · Chi phí minh bạch · Kiểm tra trước bàn giao</span></div><Link to="/thiet-bi" className="button button-outline">Tìm thiết bị phù hợp <ArrowRight size={15} /></Link></section>
    {selected && <Modal title={`Chi tiết yêu cầu #${code(selected)}`} onClose={() => setSelected(null)}><dl className="rental-modal-details">{[['Trạng thái', statuses[selected.status]], ['Thiết bị', selected.device?.name || 'Không còn trong danh mục'], ['Số lượng', selected.quantity], ['Người nhận', selected.contact.name], ['Email', selected.contact.email], ['Điện thoại', selected.contact.phone], ['Địa chỉ', selected.contact.address], ['Thời gian thuê', `${date(selected.startAt)} – ${date(selected.endAt)}`], ['Ghi chú', selected.notes || 'Không có'], ['Tổng dự kiến', `${formatMoney(selected.rentalAmount + selected.depositAmount)}đ`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Modal>}
    {cancelItem && <Modal title="Hủy yêu cầu thuê?" onClose={() => { if (!busy) setCancelItem(null); }}><p>Yêu cầu #{code(cancelItem)} sẽ được hủy. Bạn có thể tạo yêu cầu mới khi cần.</p>{actionError && <p className="rental-error" role="alert">{actionError}</p>}<div className="rental-confirm-actions"><button className="button button-outline" disabled={busy} onClick={() => setCancelItem(null)}>Giữ yêu cầu</button><button className="button" disabled={busy} onClick={cancel}>{busy ? 'Đang hủy…' : 'Xác nhận hủy'}</button></div></Modal>}
  </main></StoreLayout>;
}
function CheckMark() { return <CircleCheck size={18} />; }
