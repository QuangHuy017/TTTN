import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StoreLayout from "../components/layout/StoreLayout.jsx";
import DeviceCard, { ProductVisual, formatMoney } from "../components/catalog/DeviceCard.jsx";
import Icon from "../components/ui/Icon.jsx";
import FavoriteButton from '../components/ui/FavoriteButton.jsx';
import TechnicalSpecs from '../components/catalog/TechnicalSpecs.jsx';
import { apiRequest } from "../services/api.js";
import "../styles/home.css";
import "../styles/catalog.css";
import "../styles/detail.css";

const dateValue = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const commitments = [
  ["shield", "Thiết bị được kiểm tra", "Đối chiếu cấu hình và tình trạng thực tế trước khi nhận máy."],
  ["support", "Hỗ trợ trong quá trình thuê", "Trao đổi với đội ngũ hỗ trợ khi cần hướng dẫn sử dụng."],
  ["truck", "Bàn giao rõ ràng", "Thống nhất địa điểm, thời gian và phụ kiện kèm theo."],
  ["clipboard", "Chi phí minh bạch", "Xác nhận giá thuê, tiền cọc và điều khoản trước khi bàn giao."],
];

export default function DeviceDetailPage() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState("specs");
  const [view, setView] = useState(0);
  const [start, setStart] = useState(dateValue());
  const [end, setEnd] = useState(dateValue(1));
  const [notice, setNotice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  useEffect(() => {
    const controller = new AbortController();
    setDevice(null); setError(""); setRelated([]); setView(0); setTab("specs"); setNotice(""); setQuantity(1); setSubmitError("");
    window.scrollTo(0, 0);
    apiRequest(`/devices/${id}`, { signal: controller.signal }).then(({ data }) => {
      setDevice(data);
      return apiRequest(`/devices?categoryName=${encodeURIComponent(data.category?.name || "")}&limit=5`, { signal: controller.signal });
    }).then(({ data }) => setRelated(data.filter((item) => item._id !== id).slice(0, 4)))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.status === 404 || err.status === 400 ? "Không tìm thấy thiết bị này." : "Chưa tải được thông tin. Vui lòng thử lại.");
      });
    return () => controller.abort();
  }, [id, retry]);
  const days = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86400000));
  const validDates = start >= dateValue() && days >= 1;
  const price = device?.rentalPricePerDay || 0;
  const maxQuantity = Math.min(100, device?.stockQuantity ?? 100);
  const available = device?.status === "available" && maxQuantity > 0;
  const change = (field) => (event) => { setForm({ ...form, [field]: event.target.value }); setNotice(""); };
  function chooseDuration(duration) { setEnd(dateValueFromStart(start, duration)); setNotice(""); }
  async function sendRequest(event) {
    event.preventDefault();
    if (!validDates || !available || submitting || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) return;
    setSubmitting(true); setSubmitError(""); setNotice("");
    try {
      const token = sessionStorage.getItem('techrental-access-token');
      const result = await apiRequest('/rental-requests', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify({ deviceId: id, ...form, start, end, quantity }) });
      setNotice(`Đã gửi yêu cầu thuê thành công! Mã yêu cầu: ${result.data._id}. Số lượng và lịch trống sẽ được xác nhận khi duyệt.`);
    } catch (err) { setSubmitError(err.status && err.status < 500 ? err.message : "Chưa gửi được yêu cầu. Vui lòng thử lại."); }
    finally { setSubmitting(false); }
  }
  return <StoreLayout><main className="detail-page site-container">
    <nav className="breadcrumbs" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><Icon name="right" size={12} /><Link to="/thiet-bi">Danh mục thiết bị</Link>{device && <><Icon name="right" size={12} /><span>{device.name}</span></>}</nav>
    {!device ? <div className="detail-state" role={error ? "alert" : "status"}><Icon name={error ? "search" : "package"} size={38} /><h1>{error || "Đang tải thông tin thiết bị…"}</h1>{error && <><button className="button" onClick={() => setRetry(retry + 1)}>Thử lại</button><Link to="/thiet-bi">Về danh mục</Link></>}</div> : <>
      <header className="detail-title panel"><div className="detail-badges"><span>Mã: {device.assetCode}</span><span className={available ? "ready" : "not-ready"}>● {available ? "Có thể yêu cầu thuê" : "Hiện chưa sẵn sàng"}</span></div><h1>{device.name}</h1><p>{device.category?.name} <span>·</span> Thiết bị cho công việc của bạn</p></header>
      <div className="favorite-detail"><FavoriteButton device={device} /></div>
      <div className="detail-columns"><div className="detail-content">
        <section className="panel detail-gallery" aria-label="Hình ảnh thiết bị"><div className={`detail-main-image image-view-${view}`}><ProductVisual device={device} imageIndex={device.images?.length ? view : 0} /><span className="gallery-badge"><Icon name="verified" size={14} /> Kiểm tra trước bàn giao</span><small>{device.images?.length ? `${view + 1} / ${device.images.length}` : "Ảnh minh họa theo loại thiết bị"}</small></div><div className="detail-thumbnails">{device.images?.length ? device.images.map((image, index) => <button key={image.publicId} type="button" aria-pressed={view === index} className={view === index ? "active" : ""} onClick={() => setView(index)}><img src={image.url} alt={`${device.name} - ${index + 1}`} loading="lazy" /></button>) : ["Toàn cảnh", "Phóng to", "Cấu hình", "Tình trạng"].map((label, index) => <button key={label} type="button" aria-pressed={view === index} className={view === index ? "active" : ""} onClick={() => setView(index)}>{index < 2 ? <ProductVisual device={device} /> : <Icon name={index === 2 ? "clipboard" : "shield"} size={26} />}<span>{label}</span></button>)}</div>{!device.images?.length && view === 2 && <p className="gallery-caption">{Object.entries(device.specifications || {}).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Cấu hình đang cập nhật."}</p>}{!device.images?.length && view === 3 && <p className="gallery-caption">{device.condition || "Tình trạng sẽ được xác nhận khi bàn giao."}</p>}</section>
        <section className="panel detail-information"><div className="detail-tabs" role="tablist" aria-label="Thông tin thiết bị">{[["specs", "Thông số kỹ thuật"], ["description", "Mô tả & ứng dụng"], ["policy", "Điều kiện thuê"]].map(([key, title]) => <button id={`tab-${key}`} role="tab" aria-selected={tab === key} aria-controls="detail-tab-panel" key={key} onClick={() => setTab(key)}>{title}</button>)}</div><div className="detail-tab-content" role="tabpanel" id="detail-tab-panel" aria-labelledby={`tab-${tab}`}>
          {tab === "specs" ? <TechnicalSpecs device={device} /> : tab === "description" ? <><h2>Thiết bị phù hợp với nhu cầu của bạn</h2><p>{device.description || device.category?.description || `${device.name} thuộc danh mục ${device.category?.name || "thiết bị công nghệ"}, cho thuê theo thời gian sử dụng thực tế.`}</p><p>Hãy ghi rõ phần mềm, công việc và phụ kiện cần sử dụng trong biểu mẫu để được kiểm tra khả năng đáp ứng trước khi thuê.</p></> : <><h2>Điều kiện & quy trình thuê</h2><ol><li>Cung cấp thông tin liên hệ và thời gian cần thuê.</li><li>Xác nhận lịch trống, cấu hình, giá thuê và tiền cọc.</li><li>Kiểm tra thiết bị và ký biên bản bàn giao.</li><li>Hoàn trả đúng hạn; đối chiếu tình trạng và quyết toán.</li></ol><p>Tiền cọc tham khảo: <strong>{formatMoney(device.depositAmount)}đ / thiết bị</strong>. Điều khoản cụ thể được thống nhất trước khi thuê.</p></>}
        </div></section>
        <section className="panel detail-commitments"><h2><Icon name="shield" size={18} /> An tâm làm việc cùng TechRental</h2><div>{commitments.map(([icon, title, text]) => <article key={title}><Icon name={icon} size={24} /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
      </div><aside className="detail-rental panel" id="rental-form"><p className="rental-eyebrow">GIÁ THUÊ · THỜI GIAN LINH HOẠT</p><div className="rental-plans">{[[1, "Theo ngày"], [7, "7 ngày"], [30, "30 ngày"]].map(([duration, label]) => <button key={duration} className={days === duration ? "active" : ""} onClick={() => chooseDuration(duration)}><span>{label}</span><strong>{formatMoney(price * duration)}đ</strong><small>{duration === 1 ? "/ ngày" : `/ ${duration} ngày`}</small></button>)}</div><p className="rental-price-note">Giá theo ngày; chưa áp dụng ưu đãi dài hạn.</p>
        <form onSubmit={sendRequest}><label>Họ và tên người thuê <b>*</b><input required maxLength={100} autoComplete="name" value={form.name} onChange={change("name")} placeholder="Nhập họ và tên" /></label><div className="rental-field-row"><label>Số điện thoại <b>*</b><input required type="tel" pattern="[+0-9 ()-]{9,20}" autoComplete="tel" value={form.phone} onChange={change("phone")} placeholder="Số điện thoại liên hệ" /></label><label>Email liên hệ <b>*</b><input required type="email" autoComplete="email" value={form.email} onChange={change("email")} placeholder="ban@congty.vn" /></label></div><label>Địa chỉ nhận thiết bị <b>*</b><input required maxLength={300} autoComplete="street-address" value={form.address} onChange={change("address")} placeholder="Số nhà, đường, phường / xã, tỉnh / thành" /></label><div className="rental-field-row"><label>Ngày bắt đầu <b>*</b><input required type="date" min={dateValue()} value={start} onChange={(e) => { setStart(e.target.value); setNotice(""); }} /></label><label>Ngày hoàn trả <b>*</b><input required type="date" min={dateValueFromStart(start, 1)} value={end} onChange={(e) => { setEnd(e.target.value); setNotice(""); }} /></label></div>{!validDates && <p className="rental-error" role="alert">Chọn ngày bắt đầu từ hôm nay và ngày trả sau ngày bắt đầu.</p>}<div className="rental-quantity"><div><strong>Số lượng thuê</strong><small>{device.stockQuantity !== undefined ? `Trong kho: ${device.stockQuantity} thiết bị` : 'Số lượng sẽ được xác nhận khi duyệt'}</small></div><div className="quantity-stepper"><button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1 || submitting} onClick={() => { setQuantity(quantity - 1); setNotice(""); }}>−</button><input aria-label="Số lượng muốn thuê" type="number" min="1" max={maxQuantity} step="1" required value={quantity} disabled={submitting} onChange={(e) => { setQuantity(e.target.value === "" ? "" : Number(e.target.value)); setNotice(""); }} /><button type="button" aria-label="Tăng số lượng" disabled={quantity >= maxQuantity || submitting} onClick={() => { setQuantity(Number(quantity) + 1); setNotice(""); }}>+</button></div></div><label>Ghi chú & yêu cầu thêm<textarea rows={3} maxLength={1000} value={form.notes} onChange={change("notes")} placeholder="Phần mềm, phụ kiện hoặc thời gian nhận máy…" /></label>
          <div className="rental-summary" aria-live="polite"><div><span>Thời gian thuê</span><strong>{validDates ? days : "—"} ngày</strong></div><div><span>Số lượng</span><strong>{quantity || 0} thiết bị</strong></div><div><span>Đơn giá / ngày</span><strong>{formatMoney(price)}đ</strong></div><div><span>Tiền thuê tạm tính</span><strong>{formatMoney(validDates ? price * days * quantity : 0)}đ</strong></div><div><span>Tiền cọc tham khảo</span><strong>{formatMoney(device.depositAmount * quantity)}đ</strong></div><div className="rental-total"><strong>Tổng dự kiến</strong><strong>{formatMoney(((validDates ? price * days : 0) + device.depositAmount) * quantity)}đ</strong></div><small>Gồm tiền thuê và tiền cọc. Chi phí cuối cùng được xác nhận khi duyệt yêu cầu.</small></div>
          <button className="button rental-submit" disabled={!available || !validDates || submitting || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity}><Icon name="clipboard" size={17} />{submitting ? "ĐANG GỬI…" : available ? "GỬI YÊU CẦU THUÊ THIẾT BỊ" : "THIẾT BỊ CHƯA SẴN SÀNG"}</button><p className="rental-draft-note">Yêu cầu được gửi để xét duyệt. Chưa cần thanh toán ở bước này.</p>{submitError && <p className="rental-error" role="alert">{submitError}</p>}{notice && <p className="rental-notice" role="status">{notice}</p>}<div className="rental-assurance"><Icon name="shield" size={19} /><p>Thông tin cấu hình, lịch trống và điều kiện thuê sẽ được kiểm tra trước khi xác nhận bàn giao.</p></div>
        </form></aside></div>
      {related.length > 0 && <section className="detail-related"><div className="detail-related-heading"><div><h2>Thiết bị cùng danh mục</h2><p>Thêm lựa chọn phù hợp cho công việc của bạn</p></div><Link to={`/thiet-bi?categoryName=${encodeURIComponent(device.category?.name || "")}`}>Xem tất cả <Icon name="arrow" size={15} /></Link></div><div className="detail-related-grid">{related.map((item) => <DeviceCard key={item._id} device={item} onRent={() => { window.location.assign(`/thiet-bi/${item._id}#rental-form`); }} />)}</div></section>}
    </>}
  </main></StoreLayout>;
}
function dateValueFromStart(start, days) {
  const date = new Date(`${start}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue(1);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
