import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Headphones, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import ChatRoom from './ChatRoom.jsx';
import '../../styles/chat.css';

export default function SupportChat() {
  const location = useLocation(), navigate = useNavigate();
  const [open, setOpen] = useState(false), [token, setToken] = useState(() => sessionStorage.getItem('techrental-access-token'));
  const [user, setUser] = useState(null), [conversation, setConversation] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0), [unread, setUnread] = useState(0);
  const trigger = useRef(null);
  const hidden = location.pathname.startsWith('/admin') || location.pathname.startsWith('/nhan-vien');
  useEffect(() => { setToken(sessionStorage.getItem('techrental-access-token')); }, [location]);
  useEffect(() => {
    const sync = () => { setToken(sessionStorage.getItem('techrental-access-token')); setUser(null); setConversation(null); setUnread(0); };
    window.addEventListener('techrental-logout', sync); window.addEventListener('techrental-auth-updated', sync);
    return () => { window.removeEventListener('techrental-logout', sync); window.removeEventListener('techrental-auth-updated', sync); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setUnread(0);
    if (!token || hidden) return;
    const load = () => { if (!document.hidden) apiRequest('/chat/summary', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }).then(result => setUnread(result.unreadCount)).catch(() => {}); };
    load(); const timer = setInterval(load, 10000); window.addEventListener('techrental-chat-updated', load);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('techrental-chat-updated', load); };
  }, [token, hidden]);
  useEffect(() => {
    const controller = new AbortController(); setConversation(null); setUser(null); setError('');
    if (!open || !token || hidden) { setLoading(false); return; }
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    apiRequest('/auth/me', { signal: controller.signal, headers }).then(async result => {
      if (controller.signal.aborted) return;
      setUser(result.user);
      if (['staff', 'admin'].includes(result.user.role)) return;
      const room = await apiRequest('/chat/mine', { signal: controller.signal, method: 'POST', headers, body: '{}' });
      if (!controller.signal.aborted) setConversation(room.data);
    }).catch(err => { if (err.name !== 'AbortError') setError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Bạn hãy đăng nhập lại để nhắn tin.' : 'Chưa kết nối được bộ phận hỗ trợ. Hãy thử lại.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, token, retry, hidden]);
  if (hidden) return null;
  return <div className="support-chat-widget" onKeyDown={event => { if (event.key === 'Escape' && open) { setOpen(false); trigger.current?.focus(); } }}>{open && <section className="support-chat-window" role="dialog" aria-label="Chat với nhân viên" aria-modal="false"><header><span><Headphones size={21} /></span><div><h2>TechRental hỗ trợ</h2><p>Trao đổi trực tiếp với nhân viên</p></div><button aria-label="Đóng chat hỗ trợ" onClick={() => setOpen(false)}><X size={19} /></button></header>{!token ? <div className="chat-login"><MessageCircle size={37} /><h3>Chúng tôi có thể giúp gì cho bạn?</h3><p>Đăng nhập để nhắn tin với nhân viên và xem lại lịch sử trao đổi của bạn.</p><Link className="button" to="/dang-nhap" onClick={() => setOpen(false)}>Đăng nhập để nhắn tin <ArrowRight size={15} /></Link></div> : loading ? <p className="chat-state" role="status">Đang kết nối…</p> : error ? <div className="chat-login" role="alert"><p>{error}</p><button className="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button><Link to="/dang-nhap" onClick={() => setOpen(false)}>Đăng nhập lại</Link></div> : ['staff', 'admin'].includes(user?.role) ? <div className="chat-login"><Headphones size={37} /><h3>Hộp thư nhân viên</h3><p>Đọc và trả lời tin nhắn của khách hàng trong trang hỗ trợ.</p><button className="button" onClick={() => { setOpen(false); navigate('/nhan-vien/tin-nhan'); }}>Mở hộp thư khách hàng</button></div> : conversation && user ? <ChatRoom conversationId={conversation._id} user={user} token={token} /> : null}</section>}<button ref={trigger} className={`support-chat-trigger ${open ? 'is-open' : ''}`} aria-label={open ? 'Thu gọn chat hỗ trợ' : 'Nhắn tin hỗ trợ'} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X size={23} /> : <MessageCircle size={24} />}<span>{open ? 'Thu gọn' : 'Chat với nhân viên'}</span>{!open && unread > 0 && <i aria-label={`${unread} tin nhắn chưa đọc`}>{unread > 99 ? '99+' : unread}</i>}</button></div>;
}
