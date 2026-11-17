import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useFavorites } from '../../contexts/FavoritesContext.jsx';
import '../../styles/favorites.css';

export default function FavoriteButton({ device, compact = false }) {
  const { ids, token, loading, error, toggle, reload } = useFavorites();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const saved = ids.has(device._id);
  const label = `${saved ? 'Bỏ yêu thích' : 'Lưu yêu thích'} ${device.name}`;
  async function click() {
    if (!token) { navigate('/dang-nhap'); return; }
    if (error) { reload(); return; }
    setBusy(true); setMessage('');
    try { await toggle(device._id); }
    catch (err) { setMessage(err.status === 401 ? 'Vui lòng đăng nhập lại.' : 'Chưa lưu được thay đổi. Hãy thử lại.'); }
    finally { setBusy(false); }
  }
  return <span className={`favorite-control ${compact ? 'favorite-compact' : ''}`}><button type="button" className={`favorite-button ${saved ? 'is-saved' : ''}`} aria-label={label} aria-pressed={saved} disabled={busy || loading} title={error || label} onClick={click}><Heart size={18} fill={saved ? 'currentColor' : 'none'} />{!compact && <span>{busy ? 'Đang lưu…' : saved ? 'Đã yêu thích' : 'Lưu yêu thích'}</span>}</button>{(message || error) && <small className="favorite-error" role="alert">{message || error}</small>}</span>;
}
