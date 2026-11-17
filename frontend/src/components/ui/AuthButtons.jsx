import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Heart, UserRound, LogOut, ChevronDown, LayoutDashboard, MessageSquare } from 'lucide-react';
import { apiRequest } from "../../services/api.js";
import "../../styles/auth.css";
import NotificationBell from './NotificationBell.jsx';

export default function AuthButtons() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const menuId = useId();
  const location = useLocation();
  const token = sessionStorage.getItem('techrental-access-token');
  useEffect(() => {
    const controller = new AbortController();
    if (token) apiRequest('/auth/me', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(result => setUser(result.user)).catch(err => { if (err.status === 401) { sessionStorage.removeItem('techrental-access-token'); setUser(null); window.dispatchEvent(new Event('techrental-logout')); } });
    else setUser(null);
    return () => controller.abort();
  }, [token]);
  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    const updated = event => setUser(event.detail);
    window.addEventListener('techrental-profile-updated', updated);
    return () => window.removeEventListener('techrental-profile-updated', updated);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function logout() {
    sessionStorage.removeItem('techrental-access-token'); setUser(null); setOpen(false);
    window.dispatchEvent(new Event('techrental-logout'));
  }
  return <div className="auth-actions" ref={root} onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    {user && <NotificationBell token={token} />}
    {user ? <div className="account-dropdown"><button type="button" ref={trigger} className={`account-trigger ${open ? 'is-open' : ''}`} aria-label={open ? 'Đóng menu tài khoản' : 'Mở menu tài khoản'} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}><span className="account-avatar">{user.fullName?.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase() || 'TK'}</span><span className="account-trigger-copy"><small>Tài khoản của bạn</small><span className="auth-greeting">{user.fullName}</span></span><ChevronDown size={16} className={open ? 'rotated' : ''} /></button>
      {open && <nav id={menuId} className="account-menu" aria-label="Menu tài khoản"><div className="account-menu-heading"><strong>{user.fullName}</strong><small>{user.email}</small></div><ul><li><Link to="/yeu-cau-thue" onClick={() => setOpen(false)}><ShoppingBag size={17} />Đơn hàng của tôi</Link></li><li><Link to="/yeu-thich" onClick={() => setOpen(false)}><Heart size={17} />Thiết bị yêu thích</Link></li><li><Link to="/tai-khoan" onClick={() => setOpen(false)}><UserRound size={17} />Quản lý tài khoản</Link></li>{['staff', 'admin'].includes(user.role) && <li><Link to="/nhan-vien/tin-nhan" onClick={() => setOpen(false)}><MessageSquare size={17} />Tin nhắn khách hàng</Link></li>}{['staff', 'admin'].includes(user.role) && <li><Link to={user.role === 'admin' ? '/admin' : '/nhan-vien/quan-ly/devices'} onClick={() => setOpen(false)}><LayoutDashboard size={17} />{user.role === 'admin' ? 'Quản trị' : 'Không gian nhân viên'}</Link></li>}<li className="account-menu-logout"><button type="button" onClick={logout}><LogOut size={17} />Đăng xuất</button></li></ul></nav>}
    </div> : <><Link className="button button-outline" to="/dang-nhap">Đăng nhập</Link><Link className="button" to="/dang-ky">Đăng ký</Link></>}
  </div>;
}
