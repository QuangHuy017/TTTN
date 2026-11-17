import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api.js';
export default function useNotifications(token, page = 1) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let sequence = 0;
    setItems([]); setUnreadCount(0); setError(''); setLoading(Boolean(token));
    if (!token) return;
    async function load() {
      const current = ++sequence;
      try {
        const result = await apiRequest(`/notifications?page=${page}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!controller.signal.aborted && current === sequence) { setItems(result.data); setUnreadCount(result.unreadCount); setPagination(result.pagination); setError(''); }
      } catch (err) { if (err.name !== 'AbortError' && current === sequence) setError(err.status === 401 ? 'Vui lòng đăng nhập lại để xem thông báo.' : 'Chưa tải được thông báo. Vui lòng thử lại.'); }
      finally { if (!controller.signal.aborted && current === sequence) setLoading(false); }
    }
    load();
    const interval = setInterval(() => { if (!document.hidden) load(); }, 30000);
    const refresh = () => load();
    window.addEventListener('techrental-notifications-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('techrental-notifications-updated', refresh); window.removeEventListener('focus', refresh); };
  }, [token, page, revision]);
  async function read(id) {
    await apiRequest(id ? `/notifications/${id}/read` : '/notifications/read-all', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    window.dispatchEvent(new Event('techrental-notifications-updated'));
  }
  return { items, unreadCount, pagination, loading, error, read, refresh: () => setRevision(value => value + 1) };
}
