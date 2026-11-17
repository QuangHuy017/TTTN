import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Search, RefreshCw, ArrowLeft, MessageSquare, LogOut } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import ChatRoom from '../components/chat/ChatRoom.jsx';
import '../styles/home.css';
import '../styles/chat.css';

export default function SupportInboxPage() {
  const [user, setUser] = useState(null), [access, setAccess] = useState('loading');
  const [items, setItems] = useState([]), [selected, setSelected] = useState(''), [room, setRoom] = useState(null);
  const [query, setQuery] = useState(''), [unreadOnly, setUnreadOnly] = useState(false), [page, setPage] = useState(1), [pages, setPages] = useState(0), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const token = sessionStorage.getItem('techrental-access-token');
  useEffect(() => {
    document.title = 'Tin nhắn khách hàng | TechRental';
    const controller = new AbortController();
    if (!token) { setAccess('login'); return; }
    apiRequest('/auth/me', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }).then(result => { setUser(result.user); setAccess(['staff', 'admin'].includes(result.user.role) ? 'allowed' : 'denied'); }).catch(err => { if (err.name !== 'AbortError') setAccess(err.status === 401 ? 'login' : 'error'); });
    const logout = () => { setUser(null); setRoom(null); setSelected(''); setItems([]); setAccess('login'); };
    window.addEventListener('techrental-logout', logout);
    return () => { controller.abort(); window.removeEventListener('techrental-logout', logout); };
  }, [token]);
  useEffect(() => {
    if (access !== 'allowed') return;
    const controller = new AbortController(); let pending = false;
    setLoading(true); setError('');
    async function load() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const result = await apiRequest(`/chat/conversations?${new URLSearchParams({ page, q: query, unread: unreadOnly })}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (controller.signal.aborted) return;
        setItems(result.data); setPages(result.pagination.totalPages); setTotal(result.pagination.total); setError('');
        setSelected(previous => previous || result.data[0]?._id || '');
        if (page > 1 && page > result.pagination.totalPages) setPage(Math.max(1, result.pagination.totalPages));
      } catch (err) { if (err.name !== 'AbortError') { setError('Chưa tải được hộp thư. Vui lòng thử lại.'); if (err.status === 401) setAccess('login'); if (err.status === 403) setAccess('denied'); } }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    }
    const delay = setTimeout(load, query ? 250 : 0); const timer = setInterval(load, 5000);
    window.addEventListener('techrental-chat-updated', load); window.addEventListener('focus', load);
    return () => { controller.abort(); clearTimeout(delay); clearInterval(timer); window.removeEventListener('techrental-chat-updated', load); window.removeEventListener('focus', load); };
  }, [access, token, page, query, unreadOnly, retry]);
  if (access !== 'allowed') return <main className="support-inbox-gate"><Headphones size={40} /><h1>{access === 'loading' ? 'Đang kiểm tra tài khoản…' : access === 'denied' ? 'Hộp thư dành cho nhân viên' : access === 'error' ? 'Không thể kết nối hệ thống' : 'Đăng nhập để trả lời khách hàng'}</h1><p>Sử dụng tài khoản nhân viên hoặc admin để truy cập.</p><Link className="button" to="/dang-nhap">Đăng nhập</Link><Link to="/">Về website</Link></main>;
  const customer = room?.customer || items.find(item => item._id === selected)?.customer;
  return <div className="support-inbox"><header className="support-inbox-top"><Link className="support-inbox-brand" to="/"><span><Headphones size={22} /></span>TechRental<span>Hỗ trợ khách hàng</span></Link><div><span>{user.fullName}</span><Link to={user.role === 'admin' ? '/admin/devices' : '/nhan-vien/quan-ly/devices'}><ArrowLeft size={14} />Quản lý thiết bị</Link><button onClick={() => { sessionStorage.removeItem('techrental-access-token'); window.dispatchEvent(new Event('techrental-logout')); }}><LogOut size={15} />Đăng xuất</button></div></header><main><div className="support-inbox-heading"><div><p>KHÔNG GIAN NHÂN VIÊN</p><h1>Tin nhắn khách hàng</h1><span>Đọc lịch sử trao đổi và phản hồi khách hàng tại đây.</span></div><button className="button button-outline" onClick={() => setRetry(value => value + 1)}><RefreshCw size={15} />Làm mới</button></div><div className="support-inbox-grid"><aside className="support-conversations"><div className="support-list-tools"><label><Search size={17} /><input aria-label="Tìm cuộc trò chuyện" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm tên hoặc email khách hàng…" /></label><div><span>{total} cuộc trò chuyện</span><label><input type="checkbox" checked={unreadOnly} onChange={event => { setUnreadOnly(event.target.checked); setPage(1); }} />Chưa đọc</label></div></div>{error && <p className="chat-error" role="alert">{error}</p>}<div className="support-conversation-list">{loading ? <p className="chat-state" role="status">Đang tải hộp thư…</p> : !items.length ? <div className="chat-state"><MessageSquare size={30} /><p>{query || unreadOnly ? 'Không có cuộc trò chuyện phù hợp.' : 'Chưa có khách hàng nhắn tin.'}</p></div> : items.map(item => <button key={item._id} className={`support-conversation ${selected === item._id ? 'selected' : ''}`} onClick={() => { setSelected(item._id); setRoom(item); }}><span className="support-customer-avatar">{item.customer?.fullName?.charAt(0).toUpperCase() || 'K'}</span><div><strong>{item.customer?.fullName || 'Khách hàng'}</strong><small>{item.customer?.email || ''}</small><p>{item.lastMessage || 'Cuộc trò chuyện mới'}</p></div><aside><time>{new Date(item.lastMessageAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</time>{item.staffUnread > 0 && <span>{item.staffUnread}</span>}</aside></button>)}</div><footer><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>{page} / {Math.max(1, pages)}</span><button disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Sau</button></footer></aside><section className="support-active-room">{selected ? <><header><div><strong>{customer?.fullName || 'Khách hàng'}</strong><p>{customer?.email}{customer?.phone ? ` · ${customer.phone}` : ''}</p></div><span><i />Cuộc trò chuyện với nhân viên</span></header><ChatRoom key={selected} conversationId={selected} user={user} token={token} onConversation={setRoom} /></> : <div className="support-empty-room"><MessageSquare size={48} /><h2>Chọn một cuộc trò chuyện</h2><p>Tin nhắn của khách hàng sẽ xuất hiện ở danh sách bên trái.</p></div>}</section></div></main></div>;
}
