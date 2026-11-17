import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../services/api.js';

const mimeByExtension = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
export default function DeviceImageUploader({ images, onChange, onBusyChange, disabled }) {
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const urls = useRef([]);
  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), []);
  async function upload(files) {
    if (!files.length || busy || disabled) return;
    setError('');
    if (images.length + files.length > 20) { setError('Mỗi thiết bị tối đa 20 ảnh.'); return; }
    if (files.some(file => file.size > 10 * 1024 * 1024 || !mimeByExtension[file.name.split('.').pop().toLowerCase()])) { setError('Chọn ảnh JPG, PNG, WebP, GIF hoặc AVIF, tối đa 10 MB mỗi ảnh.'); return; }
    urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current = [];
    const tasks = files.map(file => { const preview = URL.createObjectURL(file); urls.current.push(preview); return { file, preview, status: 'queued', message: '' }; });
    setPending(tasks); setBusy(true); onBusyChange(true);
    try {
      for (let index = 0; index < tasks.length; index++) {
        const { file } = tasks[index];
        setPending(previous => previous.map((item, i) => i === index ? { ...item, status: 'uploading' } : item));
        try {
          const token = sessionStorage.getItem('techrental-access-token');
          const result = await apiRequest('/admin/device-images', { method: 'POST', body: file, headers: { Authorization: `Bearer ${token}`, 'Content-Type': mimeByExtension[file.name.split('.').pop().toLowerCase()], 'X-File-Name': encodeURIComponent(file.name) } });
          onChange(previous => previous.some(image => image.publicId === result.data.publicId) ? previous : [...previous, result.data]);
          setPending(previous => previous.map((item, i) => i === index ? { ...item, status: 'done' } : item));
        } catch (err) {
          setPending(previous => previous.map((item, i) => i === index ? { ...item, status: 'error', message: err.status === 401 ? 'Phiên đăng nhập hết hạn.' : err.message } : item));
        }
      }
    } finally { setBusy(false); onBusyChange(false); }
  }
  return <section className="adm-upload"><header><div><h3>Ảnh thiết bị</h3><p>Chọn ảnh từ máy tính. Ảnh đầu tiên là ảnh đại diện.</p></div><span>{images.length}/20 ảnh</span></header><label className={`adm-upload-picker ${disabled || busy ? 'is-disabled' : ''}`}><ImagePlus size={25} /><strong>{busy ? 'Đang tải ảnh lên…' : 'Chọn ảnh từ máy tính'}</strong><span>JPG, PNG, WebP, GIF, AVIF · Tối đa 10 MB/ảnh</span><input type="file" aria-label="Chọn ảnh thiết bị" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple disabled={disabled || busy} onChange={event => { const files = [...event.target.files]; event.target.value = ''; upload(files); }} /></label>{error && <p className="adm-error" role="alert">{error}</p>}
    {images.length > 0 && <div className="adm-upload-grid">{images.map((image, index) => <figure key={image.publicId}><img src={image.url} alt={`Ảnh thiết bị ${index + 1}`} />{index === 0 && <span>Ảnh đại diện</span>}<button type="button" disabled={disabled || busy} aria-label={`Bỏ ảnh ${index + 1}`} onClick={() => onChange(previous => previous.filter(item => item.publicId !== image.publicId))}><X size={15} /></button></figure>)}</div>}
    {pending.filter(item => item.status !== 'done').map((item, index) => <div className="adm-upload-progress" key={`${item.file.name}-${index}`}><img src={item.preview} alt="Ảnh đang tải" /><div><strong>{item.file.name}</strong><span role={item.status === 'error' ? 'alert' : 'status'}>{item.status === 'error' ? item.message : item.status === 'uploading' ? 'Đang tải lên Cloudinary…' : 'Đang chờ tải…'}</span></div>{item.status === 'error' && <button className="adm-secondary" type="button" disabled={busy || disabled} onClick={() => upload([item.file])}><RefreshCw size={13} />Thử lại</button>}</div>)}<p className="adm-upload-note">Nhấn “Lưu thiết bị” để lưu danh sách ảnh vào thiết bị.</p></section>;
}
