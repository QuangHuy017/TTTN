import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import '../../styles/device-search.css';

export default function DeviceSearchBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get('q') || '';
  const [value, setValue] = useState(query);
  const input = useRef(null);
  const id = useId();
  useEffect(() => { setValue(query); }, [query]);
  function submit(event) {
    event.preventDefault();
    const term = value.trim();
    navigate(`/thiet-bi${term ? `?${new URLSearchParams({ q: term })}` : ''}`);
  }
  return <form className="store-search device-global-search" role="search" aria-label="Tìm kiếm thiết bị trên website" onSubmit={submit}><Search size={19} aria-hidden="true" /><label className="sr-only" htmlFor={id}>Tìm kiếm toàn bộ thiết bị</label><input id={id} ref={input} type="text" name="q" maxLength={200} value={value} onChange={event => setValue(event.target.value)} placeholder="Nhập tên hoặc mã thiết bị cần tìm…" autoComplete="off" />{value && <button className="device-search-clear" type="button" aria-label="Xóa từ khóa tìm kiếm" onClick={() => { setValue(''); input.current?.focus(); }}><X size={15} /></button>}<button className="button" type="submit" aria-label="Tìm kiếm toàn bộ thiết bị">Tìm kiếm</button></form>;
}
