import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserRound, ShieldCheck } from 'lucide-react';
import StoreLayout from '../components/layout/StoreLayout.jsx';
import { apiRequest } from '../services/api.js';
import '../styles/home.css';
import '../styles/catalog.css';
import '../styles/account.css';
import ChangePasswordForm from '../components/ui/ChangePasswordForm.jsx';

export default function AccountPage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    document.title = 'Quản lý tài khoản | TechRental';
    const controller = new AbortController();
    const token = sessionStorage.getItem('techrental-access-token');
    setLoading(Boolean(token)); setLogin(!token); setError('');
    if (token) apiRequest('/auth/me', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(result => { setUser(result.user); setName(result.user.fullName); setPhone(result.user.phone || ''); setGender(result.user.gender || ''); setBirthDate(result.user.birthDate || ''); })
      .catch(err => { if (err.name !== 'AbortError') { if (err.status === 401) setLogin(true); else setError('Không tải được thông tin tài khoản. Vui lòng thử lại.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const logout = () => { controller.abort(); setUser(null); setName(''); setPhone(''); setGender(''); setBirthDate(''); setLogin(true); setLoading(false); setNotice(''); setError(''); };
    window.addEventListener('techrental-logout', logout);
    return () => { controller.abort(); window.removeEventListener('techrental-logout', logout); };
  }, [retry]);
  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const token = sessionStorage.getItem('techrental-access-token');
      const result = await apiRequest('/auth/me', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ fullName: name.trim(), phone: phone.trim(), gender, birthDate }) });
      if (sessionStorage.getItem('techrental-access-token') !== token) return;
      setUser(result.user); setName(result.user.fullName); setNotice('Đã lưu thông tin tài khoản.');
      window.dispatchEvent(new CustomEvent('techrental-profile-updated', { detail: result.user }));
    } catch (err) { if (err.status === 401) setLogin(true); else setError(err.message); }
    finally { setSaving(false); }
  }
  return <StoreLayout><main className="profile-page site-container"><div className="profile-breadcrumb"><Link to="/">Trang chủ</Link> / Quản lý tài khoản</div><header><span><UserRound size={25} /></span><div><p>TÀI KHOẢN TECHRENTAL</p><h1>Quản lý tài khoản</h1></div></header>{loading ? <section className="profile-state" role="status">Đang tải tài khoản…</section> : login ? <section className="profile-state"><ShieldCheck size={35} /><h2>Đăng nhập để quản lý tài khoản</h2><Link className="button" to="/dang-nhap">Đăng nhập</Link></section> : !user ? <section className="profile-state" role="alert"><p>{error}</p><button className="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></section> : <div className="profile-columns"><section className="profile-summary"><span className="profile-avatar">{user.fullName?.charAt(0).toUpperCase()}</span><h2>{user.fullName}</h2><p>{user.email}</p><span className="profile-role">{({ admin: 'Quản trị viên', staff: 'Nhân viên', renter: 'Khách hàng' })[user.role] || 'Thành viên'}</span><Link to="/yeu-cau-thue">Đơn hàng của tôi →</Link><Link to="/yeu-thich">Thiết bị yêu thích →</Link></section><div className="profile-editor-stack"><section className="profile-form-card"><h2>Thông tin cá nhân</h2><p>Cập nhật tên hiển thị của bạn trên TechRental.</p><form onSubmit={save}><fieldset disabled={saving}><label>Họ và tên<input name="fullName" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={event => { setName(event.target.value); setNotice(''); }} /></label><label>Email đăng nhập<input type="email" value={user.email || ''} readOnly /></label><small>Email đang dùng để đăng nhập tài khoản.</small><label>Số điện thoại<input type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={event => { setPhone(event.target.value); setNotice(''); }} placeholder="Nhập số điện thoại" /></label><div className="profile-field-row"><label>Giới tính<select value={gender} onChange={event => { setGender(event.target.value); setNotice(''); }}><option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option><option value="undisclosed">Không muốn tiết lộ</option></select></label><label>Ngày sinh<input type="date" min="1900-01-01" max={today} value={birthDate} onChange={event => { setBirthDate(event.target.value); setNotice(''); }} /></label></div>{error && <p className="profile-error" role="alert">{error}</p>}{notice && <p className="profile-success" role="status">{notice}</p>}<button className="button" disabled={saving || (name.trim() === user.fullName && phone.trim() === (user.phone || '') && gender === (user.gender || '') && birthDate === (user.birthDate || ''))}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button></fieldset></form></section><ChangePasswordForm onUserChanged={setUser} /></div></div>}</main></StoreLayout>;
}
