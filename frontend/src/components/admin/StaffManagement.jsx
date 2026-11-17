import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, UsersRound } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { apiRequest } from '../../services/api.js';
import '../../styles/staff.css';

export default function StaffManagement({ refresh = 0 }) {
  const [items, setItems] = useState([]), [page, setPage] = useState(1), [query, setQuery] = useState(''), [active, setActive] = useState('');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 }), [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState(null), [saving, setSaving] = useState(false), [formError, setFormError] = useState(''), [showPassword, setShowPassword] = useState(false);
  const [target, setTarget] = useState(null), [deleting, setDeleting] = useState(false), [deleteError, setDeleteError] = useState(''), [notice, setNotice] = useState('');
  const token = sessionStorage.getItem('techrental-access-token');
  const headers = { Authorization: `Bearer ${token}` };
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    const timer = setTimeout(() => apiRequest(`/admin/staff?${new URLSearchParams({ page, q: query, active })}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(result => { setItems(result.data); setPagination(result.pagination); if (page > 1 && page > result.pagination.totalPages) setPage(Math.max(1, result.pagination.totalPages)); })
      .catch(err => { if (err.name !== 'AbortError') setError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : 'Chưa tải được danh sách nhân viên. Vui lòng thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); }), query ? 250 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, query, active, revision, refresh, token]);
  function edit(staff = {}) { setFormError(''); setShowPassword(false); setEditor(staff); }
  async function save(event) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setFormError(''); setNotice('');
    const body = Object.fromEntries(new FormData(event.currentTarget)); body.isActive = body.isActive === 'on';
    if (editor._id && body.password === '') delete body.password;
    try {
      await apiRequest(`/admin/staff${editor._id ? `/${editor._id}` : ''}`, { method: editor._id ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) });
      setNotice(editor._id ? 'Đã cập nhật nhân viên.' : 'Đã thêm nhân viên. Nhân viên có thể đăng nhập bằng tài khoản vừa tạo.');
      setEditor(null); setRevision(value => value + 1);
    } catch (err) { setFormError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : err.message); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (deleting) return;
    setDeleting(true); setDeleteError(''); setNotice('');
    try {
      await apiRequest(`/admin/staff/${target._id}`, { method: 'DELETE', headers });
      setTarget(null); setNotice('Đã xóa nhân viên.'); setRevision(value => value + 1);
    } catch (err) { setDeleteError(err.message); }
    finally { setDeleting(false); }
  }
  return <div className="staff-management">{notice && <p className="adm-success" role="status">{notice}</p>}<section className="adm-panel adm-list"><div className="adm-panel-heading"><div><h2>Danh sách nhân viên</h2><p>{pagination.total} nhân viên · Chỉ quản lý tài khoản có vai trò nhân viên</p></div><button className="adm-primary" onClick={() => edit()}><Plus size={16} />Thêm nhân viên</button></div><div className="staff-filters"><label className="adm-search"><Search size={17} /><input aria-label="Tìm nhân viên" value={query} maxLength={100} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm tên, email hoặc số điện thoại…" /></label><label>Trạng thái<select aria-label="Lọc trạng thái nhân viên" value={active} onChange={event => { setActive(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option><option value="true">Hoạt động</option><option value="false">Đã khóa</option></select></label></div>{loading ? <div className="adm-empty" role="status">Đang tải nhân viên…</div> : error ? <div className="adm-empty" role="alert"><p>{error}</p><button className="adm-secondary" onClick={() => setRevision(value => value + 1)}>Thử lại</button></div> : !items.length ? <div className="adm-empty"><UsersRound size={34} /><h3>{query || active ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên'}</h3><p>{query || active ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : 'Nhấn Thêm nhân viên để tạo tài khoản hỗ trợ khách hàng.'}</p></div> : <div className="adm-table-wrap"><table><thead><tr>{['Nhân viên', 'Email đăng nhập', 'Số điện thoại', 'Trạng thái', 'Thao tác'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{items.map(staff => <tr key={staff._id}><td><div className="staff-name"><span aria-hidden="true">{staff.fullName?.charAt(0).toUpperCase()}</span><strong>{staff.fullName}</strong></div></td><td>{staff.email}</td><td>{staff.phone || '—'}</td><td><span className={`adm-badge ${staff.isActive ? 'available' : 'retired'}`}>{staff.isActive ? 'Hoạt động' : 'Đã khóa'}</span></td><td><div className="adm-device-actions"><button className="adm-edit" aria-label={`Sửa nhân viên ${staff.fullName}`} onClick={() => edit(staff)}><Pencil size={14} />Sửa</button><button className="adm-delete" aria-label={`Xóa nhân viên ${staff.fullName}`} onClick={() => { setTarget(staff); setDeleteError(''); }}><Trash2 size={14} />Xóa</button></div></td></tr>)}</tbody></table></div>}<div className="adm-pagination"><span>Trang {page} / {Math.max(1, pagination.totalPages)}</span><div><button disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><button disabled={loading || page >= pagination.totalPages} onClick={() => setPage(value => value + 1)}>Sau</button></div></div></section>
    {editor && <Modal title={editor._id ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'} onClose={() => { if (!saving) setEditor(null); }}><form className="staff-form" onSubmit={save}><fieldset disabled={saving}><div className="staff-form-grid"><label>Họ và tên<input autoFocus name="fullName" minLength={2} maxLength={100} required defaultValue={editor.fullName || ''} autoComplete="off" /></label><label>Email đăng nhập<input name="email" type="email" maxLength={254} required defaultValue={editor.email || ''} autoComplete="off" /></label><label>Số điện thoại<input name="phone" type="tel" maxLength={20} defaultValue={editor.phone || ''} /></label><label className="staff-full-width">{editor._id ? 'Mật khẩu mới' : 'Mật khẩu'}<div className="staff-password"><input name="password" type={showPassword ? 'text' : 'password'} required={!editor._id} minLength={8} maxLength={128} autoComplete="new-password" placeholder={editor._id ? 'Để trống nếu không đổi mật khẩu' : 'Nhập mật khẩu ít nhất 8 ký tự'} /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu nhân viên' : 'Hiện mật khẩu nhân viên'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><label className="staff-status staff-full-width"><input type="checkbox" name="isActive" defaultChecked={editor.isActive !== false} />Tài khoản hoạt động</label></div><p className="staff-form-note">Nhân viên được thêm/sửa/xóa thiết bị, tiếp nhận và xử lý yêu cầu thuê, nhắn tin với khách hàng.</p>{editor._id && <p className="staff-form-note">Đổi email, mật khẩu hoặc trạng thái sẽ yêu cầu nhân viên đăng nhập lại.</p>}{formError && <p className="adm-error" role="alert">{formError}</p>}<div className="adm-dialog-actions"><button type="button" className="adm-secondary" onClick={() => setEditor(null)}>Hủy</button><button className="adm-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu nhân viên'}</button></div></fieldset></form></Modal>}
    {target && <Modal title="Xóa nhân viên?" onClose={() => { if (!deleting) setTarget(null); }}><div className="adm-delete-confirm"><p>Bạn muốn xóa nhân viên <strong>{target.fullName}</strong> ({target.email})?</p><p>Tài khoản sẽ không thể đăng nhập. Lịch sử xử lý đơn và tin nhắn đã gửi vẫn được giữ lại.</p>{deleteError && <p className="adm-error" role="alert">{deleteError}</p>}<div className="adm-dialog-actions"><button className="adm-secondary" disabled={deleting} onClick={() => setTarget(null)}>Hủy</button><button className="adm-danger" disabled={deleting} onClick={remove}>{deleting ? 'Đang xóa…' : 'Xác nhận xóa nhân viên'}</button></div></div></Modal>}
  </div>;
}
