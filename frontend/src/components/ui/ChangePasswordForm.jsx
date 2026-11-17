import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
export default function ChangePasswordForm({ onUserChanged }) {
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit(event) {
    event.preventDefault(); const form = event.currentTarget;
    const fields = new FormData(form);
    setError(''); setNotice('');
    if (fields.get('newPassword') !== fields.get('confirmPassword')) { setError('Mật khẩu xác nhận chưa khớp.'); return; }
    setBusy(true);
    const token = sessionStorage.getItem('techrental-access-token');
    try {
      const result = await apiRequest('/auth/change-password', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ currentPassword: fields.get('currentPassword'), newPassword: fields.get('newPassword') }) });
      if (sessionStorage.getItem('techrental-access-token') !== token) return;
      sessionStorage.setItem('techrental-access-token', result.accessToken);
      onUserChanged(result.user);
      window.dispatchEvent(new CustomEvent('techrental-profile-updated', { detail: result.user }));
      window.dispatchEvent(new Event('techrental-auth-updated'));
      form.reset(); setNotice('Đổi mật khẩu thành công. Các phiên đăng nhập khác đã hết hiệu lực.');
    } catch (err) { setError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : err.message); }
    finally { setBusy(false); }
  }
  return <section className="profile-form-card profile-password-card"><h2><LockKeyhole size={18} />Đổi mật khẩu</h2><p>Nhập mật khẩu hiện tại để đặt mật khẩu mới.</p><form onSubmit={submit}><fieldset disabled={busy}>{[['currentPassword', 'Mật khẩu hiện tại', 'current-password'], ['newPassword', 'Mật khẩu mới', 'new-password'], ['confirmPassword', 'Xác nhận mật khẩu mới', 'new-password']].map(([key, label, autocomplete]) => <label key={key}>{label}<input name={key} type={show ? 'text' : 'password'} autoComplete={autocomplete} minLength={8} maxLength={128} required /></label>)}<button className="profile-password-toggle" type="button" aria-pressed={show} onClick={() => setShow(value => !value)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}{show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</button>{error && <p className="profile-error" role="alert">{error}</p>}{notice && <p className="profile-success" role="status">{notice}</p>}<button className="button" disabled={busy}>{busy ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}</button></fieldset></form></section>;
}
