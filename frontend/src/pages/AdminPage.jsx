import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Laptop, ClipboardList, Users, ArrowUpRight, ArrowLeft, LogOut, Plus, Search, RefreshCw, X, Pencil, ShieldCheck, Package, Clock, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import '../styles/admin.css';
import SpecificationEditor from '../components/ui/SpecificationEditor.jsx';
import DeviceImageUploader from '../components/ui/DeviceImageUploader.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Trash2, MessageSquare } from 'lucide-react';
import RentalRequestActions from '../components/ui/RentalRequestActions.jsx';
import StaffManagement from '../components/admin/StaffManagement.jsx';
import { UserRoundCog } from 'lucide-react';

const deviceLabels = { available: 'Còn thiết bị', borrowed: 'Đã cho thuê', out_of_stock: 'Hết hàng', maintenance: 'Bảo trì', lost: 'Thất lạc', retired: 'Ngừng sử dụng' };
const requestLabels = { pending: 'Chờ duyệt', approved: 'Đã duyệt / Chờ giao', borrowed: 'Đang thuê', completed: 'Hoàn thành', rejected: 'Từ chối', cancelled: 'Đã hủy' };
const roleLabels = { admin: 'Quản trị viên', staff: 'Nhân viên', renter: 'Khách hàng' };
const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const sections = [ ['', 'Tổng quan', LayoutDashboard], ['devices', 'Thiết bị', Laptop], ['requests', 'Yêu cầu thuê', ClipboardList], ['staff', 'Quản lý nhân viên', UserRoundCog], ['users', 'Tài khoản', Users] ];
const badge = (status, labels) => <span className={`adm-badge ${status}`}>{labels[status] || status}</span>;

export default function AdminPage() {
  const { section = '' } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const isStaff = user?.role === 'staff';
  const basePath = isStaff ? '/nhan-vien/quan-ly' : '/admin';
  const visibleSections = isStaff ? sections.filter(([key]) => ['devices', 'requests'].includes(key)) : sections;
  const [access, setAccess] = useState('loading');
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState(null);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editorImages, setEditorImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [editorCategory, setEditorCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const title = sections.find(([key]) => key === section)?.[1];
  const token = sessionStorage.getItem('techrental-access-token');
  const headers = { Authorization: `Bearer ${token}` };
  useEffect(() => {
    document.title = 'Quản trị | TechRental';
    const controller = new AbortController();
    if (!token) { setAccess('login'); return; }
    apiRequest('/auth/me', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(({ user: current }) => { setUser(current); setAccess(['admin', 'staff'].includes(current.role) ? 'allowed' : 'denied'); })
      .catch(err => { if (err.name !== 'AbortError') setAccess(err.status === 401 ? 'login' : 'error'); });
    return () => controller.abort();
  }, [token]);
  useEffect(() => {
    if (access !== 'allowed' || !title || section === 'staff' || isStaff && !['devices', 'requests'].includes(section)) return;
    const controller = new AbortController();
    setBusy(true); setError('');
    const params = new URLSearchParams({ page, q: query, status });
    const endpoint = section || 'requests';
    const timer = setTimeout(() => {
      Promise.all([
        isStaff ? Promise.resolve({ data: null }) : apiRequest('/admin/overview', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }),
        apiRequest(`/admin/${endpoint}?${params}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }),
      ]).then(([summary, list]) => { setStats(summary.data); setRows(list.data); setPagination(list.pagination); })
        .catch(err => { if (err.name !== 'AbortError') { setError('Không tải được dữ liệu. Vui lòng thử lại.'); if (err.status === 401) setAccess('login'); if (err.status === 403) setAccess('denied'); } })
        .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [access, section, page, query, status, refresh, token, title, isStaff]);
  useEffect(() => {
    if (!editor) return;
    const handler = event => {
      if (event.key === 'Escape' && !saving && !uploading) setEditor(null);
      if (event.key === 'Tab') {
        const elements = [...document.querySelectorAll('.adm-dialog button:not(:disabled), .adm-dialog input:not(:disabled):not([type=hidden]), .adm-dialog select:not(:disabled), .adm-dialog textarea:not(:disabled)')].filter(element => !element.closest('fieldset:disabled'));
        const first = elements[0], last = elements.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, saving, uploading]);
  async function openEditor(device = {}) {
    setFormError(''); setNotice('');
    try {
      const result = await apiRequest('/categories', { headers });
      setCategories(result.data); setEditorCategory(device.category?._id || ''); setEditorImages(device.images || []); setUploading(false); setEditor(device);
    } catch { setError('Không tải được danh mục. Hãy thử lại.'); }
  }
  async function save(event) {
    if (uploading) { event.preventDefault(); return; }
    event.preventDefault(); setSaving(true); setFormError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const specs = [];
    for (const [field, value] of Object.entries(body)) {
      if (field.startsWith('spec-name-')) {
        const specValue = body[`spec-value-${field.slice(10)}`]?.trim() || '';
        if (specValue && !value.trim()) { setFormError('Vui lòng nhập tên cho thông số bổ sung.'); setSaving(false); return; }
        if (specValue) specs.push([value.trim(), specValue]);
      }
    }
    if (new Set(specs.map(([key]) => key)).size !== specs.length) { setFormError('Tên thông số không được trùng nhau.'); setSaving(false); return; }
    for (const field of Object.keys(body)) if (field.startsWith('spec-name-') || field.startsWith('spec-value-')) delete body[field];
    body.specifications = Object.fromEntries(specs);
    body.isPublished = body.isPublished === 'on';
    body.rentalPricePerDay = body.rentalPricePerDay === '' ? null : Number(body.rentalPricePerDay);
    body.stockQuantity = Number(body.stockQuantity);
    body.images = editorImages.map(({ publicId, uploadToken }) => ({ publicId, ...(uploadToken ? { uploadToken } : {}) }));
    try {
      await apiRequest(`/admin/devices${editor._id ? `/${editor._id}` : ''}`, { headers, method: editor._id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setEditor(null); setNotice('Đã lưu thiết bị thành công.'); setRefresh(value => value + 1);
    } catch (err) { setFormError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : err.message); }
    finally { setSaving(false); }
  }
  function logout() { sessionStorage.removeItem('techrental-access-token'); navigate('/dang-nhap'); }
  async function deleteDevice() {
    if (deleting) return;
    setDeleting(true); setDeleteError('');
    try {
      await apiRequest(`/admin/devices/${deleteTarget._id}`, { method: 'DELETE', headers });
      setDeleteTarget(null); setNotice('Đã xóa thiết bị thành công.');
      if (rows.length === 1 && page > 1) setPage(value => value - 1);
      setRefresh(value => value + 1);
    } catch (err) { setDeleteError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : err.message); }
    finally { setDeleting(false); }
  }
  if (access === 'allowed' && isStaff && !['devices', 'requests'].includes(section)) return <Navigate to={`${basePath}/devices`} replace />;
  if (access !== 'allowed') return <main className="adm-gate"><ShieldCheck size={42} /><h1>{access === 'loading' ? 'Đang kiểm tra quyền truy cập…' : access === 'denied' ? 'Khu vực dành cho nhân viên và quản trị viên' : access === 'error' ? 'Không thể kết nối hệ thống' : 'Đăng nhập để quản trị'}</h1><p>{access === 'denied' ? 'Tài khoản hiện tại không có quyền truy cập trang này.' : 'Sử dụng tài khoản nhân viên hoặc admin của TechRental để tiếp tục.'}</p><Link to="/dang-nhap" className="adm-primary">Đăng nhập</Link><Link to="/">Về trang chủ</Link></main>;
  return <div className="adm-app">
    <aside className="adm-sidebar"><Link to={isStaff ? `${basePath}/devices` : basePath} className="adm-brand"><span><Laptop size={23} /></span>TechRental<span className="adm-brand-dot">.</span></Link><div className="adm-workspace"><span className="adm-workspace-icon"><ShieldCheck size={20} /></span><div><strong>{isStaff ? 'Không gian nhân viên' : 'Không gian quản trị'}</strong><small>Hệ thống cho thuê thiết bị</small></div></div><p className="adm-nav-label">QUẢN LÝ HỆ THỐNG</p><nav aria-label="Quản trị">{visibleSections.map(([key, label, Icon]) => <NavLink key={key} end to={`${basePath}${key ? `/${key}` : ''}`} onClick={() => { setPage(1); setQuery(''); setStatus(''); setNotice(''); }}><Icon size={19} />{label}{key === 'requests' && stats?.pending > 0 && <span className="adm-count">{stats.pending}</span>}</NavLink>)}<Link to="/nhan-vien/tin-nhan"><MessageSquare size={19} />Tin nhắn khách hàng</Link></nav><div className="adm-sidebar-bottom"><div className="adm-help"><Package size={23} /><strong>Mọi thiết bị, một nơi quản lý.</strong><p>Theo dõi tài sản và yêu cầu thuê của bạn tại TechRental.</p></div><Link to="/"><ArrowLeft size={17} />Về website</Link><button onClick={logout}><LogOut size={17} />Đăng xuất</button></div></aside>
    <div className="adm-body"><header className="adm-topbar"><span>Không gian làm việc <span className="adm-slash">/</span> <strong>{title || 'Không tìm thấy'}</strong></span><div className="adm-profile"><span className="adm-avatar">{user.fullName?.charAt(0).toUpperCase()}</span><div><strong>{user.fullName}</strong><small>{isStaff ? 'Nhân viên' : 'Quản trị viên'}</small></div></div></header>
    <main className="adm-main"><div className="adm-heading"><div><p className="adm-eyebrow">TECHRENTAL {isStaff ? 'STAFF' : 'ADMIN'}</p><h1>{section ? title || 'Không tìm thấy trang' : 'Tổng quan hệ thống'}</h1><p>{section === 'staff' ? 'Thêm, sửa và quản lý tài khoản nhân viên hỗ trợ khách hàng.' : section === 'devices' ? 'Quản lý tài sản, giá thuê và tình trạng thiết bị.' : section === 'requests' ? 'Theo dõi thông tin và trạng thái của từng yêu cầu thuê.' : section === 'users' ? 'Danh sách tài khoản và quyền truy cập trong hệ thống.' : 'Chào mừng trở lại. Cùng theo dõi hoạt động cho thuê hôm nay.'}</p></div><div className="adm-heading-actions"><button className="adm-secondary" disabled={busy && section !== 'staff'} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Làm mới</button>{section === 'devices' && <button className="adm-primary" onClick={() => openEditor()}><Plus size={17} />Thêm thiết bị</button>}</div></div>
    {notice && <div className="adm-success" role="status">{notice}</div>}{error && <div className="adm-error" role="alert">{error}</div>}
    {!title ? <Link to="/admin">Về tổng quan</Link> : section === 'staff' ? <StaffManagement refresh={refresh} /> : <>
    {!section && <><section className="adm-stats" aria-label="Thống kê">{[[Laptop, 'Tổng thiết bị', stats?.devices, `${stats?.available ?? '—'} thiết bị sẵn sàng`, 'purple'], [Clock, 'Yêu cầu chờ duyệt', stats?.pending, 'Cần kiểm tra thông tin thuê', 'orange'], [Package, 'Đơn thuê đang hoạt động', stats?.active, 'Đã duyệt hoặc đang thuê', 'blue'], [Users, 'Tổng tài khoản', stats?.users, 'Khách hàng và nhân sự', 'green']].map(([Icon, label, value, note, color]) => <article key={label}><div className="adm-stat-top"><span>{label}</span><span className={`adm-stat-icon ${color}`}><Icon size={20} /></span></div><strong>{value ?? '—'}</strong><small>{note}</small></article>)}</section><div className="adm-insights"><section className="adm-panel"><div className="adm-panel-heading"><div><h2>Tình trạng thiết bị</h2><p>Số lượng tài sản trong hệ thống</p></div><Laptop size={20} /></div><div className="adm-inventory"><div><span className="adm-inventory-number">{stats?.available ?? '—'}<small> / {stats?.devices ?? '—'}</small></span><p>thiết bị sẵn sàng cho thuê</p></div><div className="adm-progress"><span style={{ width: `${stats?.devices ? stats.available / stats.devices * 100 : 0}%` }} /></div><div className="adm-inventory-legend"><span><i />Sẵn sàng: {stats?.available ?? '—'}</span><span><i />Bảo trì: {stats?.maintenance ?? '—'}</span><span>Khác: {stats ? stats.devices - stats.available - stats.maintenance : '—'}</span></div></div></section><section className="adm-quick"><span className="adm-quick-icon"><CheckCircle2 size={25} /></span><h2>Quản lý hiệu quả hơn</h2><p>Kiểm tra các yêu cầu mới và giữ thông tin thiết bị luôn cập nhật.</p><Link to="/admin/devices" onClick={() => setPage(1)}>Quản lý thiết bị <ArrowUpRight size={17} /></Link><span>{stats?.completed ?? '—'} yêu cầu đã hoàn thành</span></section></div></>}
    <section className="adm-panel adm-list"><div className="adm-panel-heading"><div><h2>{section === 'devices' ? 'Danh sách thiết bị' : section === 'users' ? 'Danh sách tài khoản' : section ? 'Danh sách yêu cầu thuê' : 'Yêu cầu thuê gần đây'}</h2><p>{pagination.total} {section === 'devices' ? 'thiết bị' : section === 'users' ? 'tài khoản' : 'yêu cầu'} trong danh sách</p></div>{!section && <Link to="/admin/requests" onClick={() => setPage(1)}>Xem tất cả <ArrowUpRight size={16} /></Link>}</div>
    {section === 'devices' && <div className="adm-filters"><label className="adm-search"><Search size={18} /><input aria-label="Tìm thiết bị" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm tên thiết bị hoặc mã tài sản…" /></label></div>}
    {section === 'requests' && <div className="adm-filters"><label>Trạng thái <select aria-label="Lọc trạng thái" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{Object.entries(requestLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>}
    {busy ? <div className="adm-empty" role="status">Đang tải dữ liệu…</div> : error ? <div className="adm-empty">Dữ liệu chưa sẵn sàng. Nhấn Làm mới để thử lại.</div> : rows.length === 0 ? <div className="adm-empty"><Package size={32} /><h3>Chưa có dữ liệu</h3><p>{query || status ? 'Thử thay đổi điều kiện tìm kiếm hoặc bộ lọc.' : 'Các bản ghi mới sẽ xuất hiện tại đây.'}</p></div> : <div className="adm-table-wrap"><table><thead><tr>{(section === 'devices' ? ['Ảnh', 'Thiết bị', 'Danh mục', 'Tồn kho', 'Giá thuê / ngày', 'Trạng thái', 'Thao tác'] : section === 'users' ? ['Tài khoản', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo'] : ['Yêu cầu / Khách hàng', 'Thiết bị', 'Thời gian thuê', 'Tiền thuê', 'Trạng thái', 'Thao tác']).map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row._id}>{section === 'devices' ? <><td><div className="adm-stock-image">{row.images?.[0]?.url ? <img src={row.images[0].url} alt={row.name} loading="lazy" /> : <Laptop size={24} />}</div></td><td><strong>{row.name}</strong><small>{row.assetCode}</small>{row.isPublished === false && <span className="adm-badge pending">Bản nháp</span>}</td><td>{row.category?.name || '—'}</td><td className="adm-stock-count"><strong>{row.stockQuantity ?? (row.status === 'borrowed' ? 0 : 1)} máy</strong><small>Đang thuê: {row.rentedQuantity ?? (row.status === 'borrowed' ? 1 : 0)}</small></td><td className="adm-money">{row.rentalPricePerDay == null ? 'Chưa có giá' : money(row.rentalPricePerDay)}</td><td>{badge(row.status, deviceLabels)}</td><td><div className="adm-device-actions"><button className="adm-edit" aria-label={`Sửa ${row.name}`} onClick={() => openEditor(row)}><Pencil size={15} />Sửa</button><button className="adm-delete" aria-label={`Xóa ${row.name}`} onClick={() => { setDeleteTarget(row); setDeleteError(''); }}><Trash2 size={15} />Xóa</button></div></td></> : section === 'users' ? <><td><strong>{row.fullName}</strong></td><td>{row.email}</td><td>{roleLabels[row.role] || row.role}</td><td>{badge(row.isActive ? 'available' : 'retired', { available: 'Hoạt động', retired: 'Đã khóa' })}</td><td>{date(row.createdAt)}</td></> : <><td><strong>{row.contact?.name || 'Khách hàng'}</strong><small>#{row._id.slice(-8).toUpperCase()} · {row.contact?.phone}</small></td><td><strong>{row.device?.name || 'Thiết bị đã xóa'}</strong><small>{row.device?.assetCode} · SL: {row.quantity}</small></td><td>{date(row.startAt)}<small>đến {date(row.endAt)}</small></td><td className="adm-money">{money(row.rentalAmount)}</td><td>{badge(row.status, requestLabels)}</td><td><RentalRequestActions request={row} onChanged={(_data, message) => { setNotice(message); if (status && rows.length === 1 && page > 1) setPage(value => value - 1); setRefresh(value => value + 1); }} /></td></>}</tr>)}</tbody></table></div>}
    <div className="adm-pagination"><span>Trang {page} / {Math.max(1, pagination.pages)}</span><div><button disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>Trước</button><button disabled={page >= pagination.pages || busy} onClick={() => setPage(value => value + 1)}>Sau</button></div></div></section></>}
    <footer className="adm-footer">TechRental <span>Hệ thống quản lý cho thuê thiết bị</span></footer></main></div>
    {deleteTarget && <Modal title="Xóa thiết bị?" onClose={() => { if (!deleting) setDeleteTarget(null); }}><div className="adm-delete-confirm"><p>Bạn muốn xóa <strong>{deleteTarget.name}</strong> ({deleteTarget.assetCode}) khỏi danh sách thiết bị?</p><p>Lịch sử thuê đã hoàn thành vẫn được giữ lại.</p>{deleteError && <p className="adm-error" role="alert">{deleteError}</p>}<div className="adm-dialog-actions"><button type="button" className="adm-secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>Hủy</button><button type="button" className="adm-danger" disabled={deleting} onClick={deleteDevice}>{deleting ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div></div></Modal>}
    {editor && <div className="adm-overlay"><section className="adm-dialog" role="dialog" aria-modal="true" aria-labelledby="adm-editor-title"><div className="adm-panel-heading"><h2 id="adm-editor-title">{editor._id ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'}</h2><button disabled={saving || uploading} onClick={() => setEditor(null)} aria-label="Đóng"><X size={21} /></button></div><form onSubmit={save}><fieldset disabled={saving}><DeviceImageUploader images={editorImages} onChange={setEditorImages} onBusyChange={setUploading} disabled={saving} /><div className="adm-form-grid"><label>Tên thiết bị<input autoFocus name="name" required maxLength={200} defaultValue={editor.name} /></label><label>Mã tài sản<input name="assetCode" required maxLength={200} defaultValue={editor.assetCode} /></label><label>Danh mục<select name="category" required value={editorCategory} onChange={event => setEditorCategory(event.target.value)}><option value="" disabled>Chọn danh mục</option>{categories.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label>Trạng thái<select name="status" defaultValue={editor.status || 'available'}>{Object.entries(deviceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Số lượng trong kho<input name="stockQuantity" aria-label="Số lượng trong kho" type="number" min="0" max="1000000" step="1" required defaultValue={editor.stockQuantity ?? (editor.status === 'borrowed' ? 0 : 1)} /><small className="adm-stock-note">Số máy đang có sẵn trong kho. Ví dụ: 45.</small></label><label>Giá thuê / ngày (VND)<input name="rentalPricePerDay" type="number" min="0" max="9007199254740991" step="1" defaultValue={editor.rentalPricePerDay ?? ''} /></label><label>Tình trạng thực tế<input name="condition" maxLength={300} defaultValue={editor.condition} placeholder="Ví dụ: Hoạt động tốt" /></label><label className="adm-wide-field">Mô tả thiết bị<textarea name="description" maxLength={10000} rows={5} defaultValue={editor.description || ''} placeholder="Thêm mô tả thiết bị khi bạn sẵn sàng" /></label><label className="adm-publish-field"><input type="checkbox" name="isPublished" defaultChecked={editor.isPublished !== false} />Hiển thị trên website</label></div><SpecificationEditor specifications={editor.specifications} categoryName={categories.find(category => category._id === editorCategory)?.name || ''} />{!categories.length && <p role="alert">Chưa có danh mục. Cần tạo danh mục trong cơ sở dữ liệu trước khi thêm thiết bị.</p>}{formError && <p className="adm-error" role="alert">{formError}</p>}<div className="adm-dialog-actions"><button type="button" className="adm-secondary" disabled={uploading} onClick={() => setEditor(null)}>Hủy</button><button className="adm-primary" disabled={!categories.length || uploading}>{saving ? 'Đang lưu…' : 'Lưu thiết bị'}</button></div></fieldset></form></section></div>}
  </div>;
}
