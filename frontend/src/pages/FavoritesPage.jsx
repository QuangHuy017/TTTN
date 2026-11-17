import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import StoreLayout from '../components/layout/StoreLayout.jsx';
import DeviceCard from '../components/catalog/DeviceCard.jsx';
import { useFavorites } from '../contexts/FavoritesContext.jsx';
import { apiRequest } from '../services/api.js';
import '../styles/home.css';
import '../styles/catalog.css';
import '../styles/favorites.css';

export default function FavoritesPage() {
  const { token, revision } = useFavorites();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => { document.title = 'Thiết bị yêu thích | TechRental'; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setItems([]); setError(''); setExpired(false); setLoading(Boolean(token));
    if (!token) return;
    apiRequest(`/favorites?page=${page}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(result => {
        if (page > 1 && page > result.pagination.totalPages) { setPage(Math.max(1, result.pagination.totalPages)); return; }
        setItems(result.data); setPagination(result.pagination);
      }).catch(err => { if (err.name !== 'AbortError') { if (err.status === 401) setExpired(true); else setError('Chưa tải được danh sách yêu thích. Vui lòng thử lại.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, page, revision, retry]);
  return <StoreLayout><main className="favorites-page site-container"><div className="favorites-breadcrumb"><Link to="/">Trang chủ</Link><span>/</span>Thiết bị yêu thích</div><header className="favorites-heading"><div><p>DÀNH RIÊNG CHO BẠN</p><h1>Thiết bị yêu thích<span><Heart size={24} /></span></h1><div>Lưu lại những thiết bị bạn quan tâm để dễ dàng tìm và thuê sau.</div></div><Link className="button button-outline" to="/thiet-bi">Khám phá thiết bị <ArrowRight size={16} /></Link></header>
    {!token || expired ? <section className="favorites-empty"><Heart size={40} /><h2>Đăng nhập để lưu thiết bị yêu thích</h2><p>Danh sách yêu thích được lưu riêng theo tài khoản của bạn.</p><Link className="button" to="/dang-nhap">Đăng nhập</Link></section> : loading ? <div className="favorites-empty" role="status">Đang tải thiết bị yêu thích…</div> : error ? <div className="favorites-empty" role="alert"><h2>{error}</h2><button className="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : !items.length ? <section className="favorites-empty"><Heart size={44} /><h2>Chưa có thiết bị yêu thích</h2><p>Nhấn trái tim trên thiết bị để lưu vào bộ sưu tập của bạn.</p><Link className="button" to="/thiet-bi">Tìm thiết bị phù hợp <ArrowRight size={16} /></Link></section> : <><div className="favorites-results"><strong>{pagination.total} thiết bị đã lưu</strong><span>Nhấn trái tim lần nữa để bỏ yêu thích</span></div><div className="catalog-product-grid favorites-grid">{items.map(device => <DeviceCard key={device._id} device={device} onRent={() => navigate(`/thiet-bi/${device._id}#rental-form`)} />)}</div>{pagination.totalPages > 1 && <div className="favorites-pagination"><button className="button button-outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>Trang {page} / {pagination.totalPages}</span><button className="button button-outline" disabled={page >= pagination.totalPages} onClick={() => setPage(value => value + 1)}>Sau</button></div>}</>}
  </main></StoreLayout>;
}
