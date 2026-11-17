import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications.js';
import '../../styles/notifications.css';
export default function NotificationBell({ token }) {
  const feed = useNotifications(token);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const root = useRef(null), trigger = useRef(null);
  const id = useId(); const navigate = useNavigate();
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  async function read(notification) {
    setBusy(true); setError('');
    try { await feed.read(notification?._id); if (notification) { setOpen(false); navigate('/yeu-cau-thue'); } }
    catch { setError('Chưa cập nhật được thông báo. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <div className="notification-bell" ref={root} onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}><button ref={trigger} className="notification-trigger" aria-label="Thông báo" aria-expanded={open} aria-controls={id} onClick={() => { setOpen(value => !value); if (!open) feed.refresh(); }}><Bell size={20} />{feed.unreadCount > 0 && <span aria-label={`${feed.unreadCount} thông báo chưa đọc`}>{feed.unreadCount > 99 ? '99+' : feed.unreadCount}</span>}</button>{open && <section id={id} className="notification-dropdown" aria-label="Danh sách thông báo"><header><h2>Thông báo</h2><button disabled={busy || !feed.unreadCount} onClick={() => read(null)} title="Đánh dấu tất cả đã đọc" aria-label="Đánh dấu tất cả đã đọc"><CheckCheck size={18} /></button></header>{error && <p role="alert">{error}</p>}{feed.loading ? <p role="status">Đang tải thông báo…</p> : feed.error ? <div className="notification-empty" role="alert"><p>{feed.error}</p><button onClick={feed.refresh}>Thử lại</button></div> : !feed.items.length ? <p className="notification-empty">Chưa có thông báo mới.</p> : <ul>{feed.items.slice(0, 5).map(item => <li key={item._id}><button className={!item.readAt ? 'unread' : ''} disabled={busy} onClick={() => read(item)}><span className="notification-item-dot" /><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></div></button></li>)}</ul>}<Link className="notification-view-all" to="/thong-bao" onClick={() => setOpen(false)}>Xem tất cả thông báo</Link></section>}</div>;
}
