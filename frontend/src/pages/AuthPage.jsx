import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Check, Laptop } from "lucide-react";
import StoreLayout from "../components/layout/StoreLayout.jsx";
import { apiRequest } from "../services/api.js";
import "../styles/home.css";
import "../styles/catalog.css";
import "../styles/auth.css";

export default function AuthPage({ registration = false }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { document.title = `${registration ? "Đăng ký" : "Đăng nhập"} | TechRental`; window.scrollTo(0, 0); return () => { document.title = "TechRental"; }; }, [registration]);
  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const password = fields.get("password");
    if (registration && password !== fields.get("confirmPassword")) { setError("Mật khẩu xác nhận chưa khớp."); return; }
    const body = { email: fields.get("email").trim(), password };
    if (registration) body.fullName = fields.get("fullName").trim();
    setBusy(true); setError("");
    try {
      const result = await apiRequest(`/auth/${registration ? "register" : "login"}`, { method: "POST", body: JSON.stringify(body) });
      sessionStorage.setItem("techrental-access-token", result.accessToken);
      navigate(result.user?.role === 'admin' ? '/admin' : result.user?.role === 'staff' ? '/nhan-vien/quan-ly/devices' : '/thiet-bi', { replace: true });
    } catch (err) {
      setError(err.status === 409 ? "Email này đã được đăng ký. Hãy đăng nhập hoặc sử dụng email khác." : err.status === 401 ? "Email hoặc mật khẩu không đúng." : err.status === 429 ? "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau." : "Không thể hoàn tất. Vui lòng kiểm tra thông tin và thử lại.");
    } finally { setBusy(false); }
  }
  return <StoreLayout><main className="auth-page site-container"><Link className="auth-back" to="/">← Về trang chủ</Link><div className="auth-card">
    <section className="auth-story"><div className="auth-story-label"><Laptop size={18} /> TECHRENTAL</div><h2>Thiết bị sẵn sàng.<br />Công việc trọn vẹn.</h2><p>Giải pháp thuê thiết bị linh hoạt, đồng hành cùng công việc của bạn mỗi ngày.</p><div className="auth-story-image"><img src="/images/office.jpg" alt="Không gian làm việc với thiết bị công nghệ" /><span><ShieldCheck size={17} /> An tâm từ lựa chọn đến bàn giao</span></div><ul>{["Lựa chọn thiết bị phù hợp nhu cầu", "Gửi yêu cầu thuê nhanh chóng", "Thông tin và chi phí rõ ràng"].map(text => <li key={text}><Check size={16} />{text}</li>)}</ul></section>
    <section className="auth-form-section"><div className="auth-page-tabs"><Link to="/dang-nhap" className={!registration ? "active" : ""} aria-current={!registration ? "page" : undefined}>Đăng nhập</Link><Link to="/dang-ky" className={registration ? "active" : ""} aria-current={registration ? "page" : undefined}>Đăng ký</Link></div><p className="auth-kicker">TÀI KHOẢN TECHRENTAL</p><h1>{registration ? "Tạo tài khoản của bạn" : "Chào mừng trở lại!"}</h1><p className="auth-intro">{registration ? "Chỉ vài thông tin để bắt đầu cùng TechRental." : "Đăng nhập để tiếp tục hành trình cùng TechRental."}</p>
      <form className="auth-form" onSubmit={submit}><fieldset disabled={busy}>
        {registration && <label>Họ và tên <span>*</span><input name="fullName" required minLength={2} maxLength={100} autoComplete="name" placeholder="Nguyễn Văn An" /></label>}
        <label>Email <span>*</span><input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="ban@example.com" /></label>
        <label htmlFor="auth-password">Mật khẩu <span>*</span></label><div className="auth-password"><input id="auth-password" name="password" type={showPassword ? "text" : "password"} required minLength={8} maxLength={128} autoComplete={registration ? "new-password" : "current-password"} placeholder="Nhập mật khẩu (ít nhất 8 ký tự)" /><button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
        {registration && <label>Xác nhận mật khẩu <span>*</span><input name="confirmPassword" type={showPassword ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Nhập lại mật khẩu" /></label>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="button auth-primary" type="submit">{busy ? "Đang xử lý…" : registration ? "Tạo tài khoản" : "Đăng nhập"}<ArrowRight size={17} /></button>
      </fieldset></form><p className="auth-switch">{registration ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <Link to={registration ? "/dang-nhap" : "/dang-ky"}>{registration ? "Đăng nhập" : "Đăng ký ngay"}</Link></p><div className="auth-security"><ShieldCheck size={16} /><span>Đăng nhập để quản lý yêu cầu thuê của bạn.</span></div>
    </section></div></main></StoreLayout>;
}
