import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '../services/api.js';

const FavoritesContext = createContext(null);
export const useFavorites = () => useContext(FavoritesContext);
export function FavoritesProvider({ children }) {
  const location = useLocation();
  const [ids, setIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [retry, setRetry] = useState(0);
  const [token, setToken] = useState(() => sessionStorage.getItem('techrental-access-token'));
  const generation = useRef(0);
  const pending = useRef(new Set());
  useEffect(() => { setToken(sessionStorage.getItem('techrental-access-token')); }, [location]);
  useEffect(() => {
    const logout = () => { generation.current++; setToken(null); setIds(new Set()); setError(''); setLoading(false); };
    window.addEventListener('techrental-logout', logout);
    const updated = () => setToken(sessionStorage.getItem('techrental-access-token'));
    window.addEventListener('techrental-auth-updated', updated);
    return () => { window.removeEventListener('techrental-logout', logout); window.removeEventListener('techrental-auth-updated', updated); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const current = ++generation.current;
    pending.current.clear(); setIds(new Set()); setError(''); setLoading(Boolean(token));
    if (!token) return;
    apiRequest('/favorites/ids', { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(result => { if (generation.current === current) setIds(new Set(result.data)); })
      .catch(err => { if (err.name !== 'AbortError' && generation.current === current) setError(err.status === 401 ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' : 'Không tải được trạng thái yêu thích. Nhấn để thử lại.'); })
      .finally(() => { if (!controller.signal.aborted && generation.current === current) setLoading(false); });
    return () => controller.abort();
  }, [token, retry]);
  async function toggle(id) {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    const current = generation.current;
    const saved = !ids.has(id);
    try {
      await apiRequest(`/favorites/${id}`, { method: saved ? 'PUT' : 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (generation.current === current) {
        setIds(previous => { const next = new Set(previous); if (saved) next.add(id); else next.delete(id); return next; });
        setRevision(value => value + 1);
      }
    } finally { if (generation.current === current) pending.current.delete(id); }
  }
  return <FavoritesContext.Provider value={{ ids, token, loading, error, revision, toggle, reload: () => setRetry(value => value + 1) }}>{children}</FavoritesContext.Provider>;
}
