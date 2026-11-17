import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import StoreLayout from '../components/layout/StoreLayout.jsx';
import useNotifications from '../hooks/useNotifications.js';
import '../styles/home.css';
import '../styles/catalog.css';
import '../styles/notifications.css';
export default function NotificationsPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('techrental-access-token'));
  const [page, setPage] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const feed = useNotifications(token, page); const navigate = useNavigate();
  useEffect(() => { document.title = 'Thông báo | TechRental'; const logout = () => setToken(null); window.addEventListener('techrental-logout', logout); return () => window.removeEventListener('techrental-logout', logout); }, []);
  async function read(item) {
    setBusy(true); setError('');
    try { await feed.read(item?._id); if (item) navigate('/yeu-cau-thue'); }
    catch { setError('Chưa cập nhật được thông báo. Hãy thử lại.'); }
    finally { setBusy(false); }
  }
  return <StoreLayout><main className="notifications-page site-container"><header><div><p>TÀI KHOẢN TECHRENTAL</p><h1><Bell size={25} />Thông báo của tôi</h1></div>{token && <button className="button button-outline" disabled={busy || !feed.unreadCount} onClick={() => read(null)}>Đánh dấu tất cả đã đọc</button>}</header>{error && <p role="alert">{error}</p>}{!token ? <section className="notifications-state"><h2>Đăng nhập để xem thông báo</h2><Link className="button" to="/dang-nhap">Đăng nhập</Link></section> : feed.loading ? <p className="notifications-state" role="status">Đang tải thông báo…</p> : feed.error ? <section className="notifications-state" role="alert"><p>{feed.error}</p><button className="button" onClick={feed.refresh}>Thử lại</button></section> : !feed.items.length ? <section className="notifications-state"><Bell size={38} /><h2>Bạn chưa có thông báo nào</h2><p>Khi yêu cầu thuê được duyệt, thông báo sẽ xuất hiện tại đây.</p></section> : <><p className="notifications-count">{feed.unreadCount} thông báo chưa đọc · {feed.pagination.total} thông báo</p><ul className="notifications-list">{feed.items.map(item => <li key={item._id}><button className={!item.readAt ? 'unread' : ''} disabled={busy} onClick={() => read(item)}><span><Bell size={20} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></div>{!item.readAt && <i aria-label="Chưa đọc" />}</button></li>)}</ul>{feed.pagination.totalPages > 1 && <div className="notifications-pagination"><button className="button button-outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>Trang {page} / {feed.pagination.totalPages}</span><button className="button button-outline" disabled={page >= feed.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Sau</button></div>}</>}</main></StoreLayout>;
}
