import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../ui/Icon.jsx";
import Modal from "../ui/Modal.jsx";
import AuthButtons from "../ui/AuthButtons.jsx";
import DeviceSearchBar from '../ui/DeviceSearchBar.jsx';
export default function StoreLayout({ children }) {
  const [menu, setMenu] = useState(false);
  const [info, setInfo] = useState("");
  return (
    <div className="rental-site catalog-site">
      <div className="announcement">
        <div className="site-container">
          <span>
            <Icon name="shield" size={14} /> Thiết bị sẵn sàng. Công việc trọn
            vẹn.
          </span>
          <span className="announcement-right">
            Thuê linh hoạt · Chi phí minh bạch
          </span>
        </div>
      </div>
      <header className="store-header">
        <div className="site-container store-header-main">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <Icon name="monitor" size={23} />
            </span>
            <span>
              Tech<span className="brand-accent">Rental</span>
              <small>THIẾT BỊ TỐT · GIẢI PHÁP HAY</small>
            </span>
          </Link>
          <DeviceSearchBar />
          <AuthButtons />
          <button
            className="icon-button menu-toggle"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Đóng menu" : "Mở menu"}
            aria-expanded={menu}
          >
            <Icon name={menu ? "close" : "menu"} />
          </button>
        </div>
        <div className="store-nav-wrap">
          <nav
            className={`site-container store-nav ${menu ? "open" : ""}`}
            aria-label="Điều hướng cửa hàng"
          >
            <Link to="/">Trang chủ</Link>
            <Link
              to="/thiet-bi"
              className="current"
              onClick={() => setMenu(false)}
            >
              Danh mục thiết bị <Icon name="down" size={12} />
            </Link>
            <a href="/#quy-trinh">Quy trình thuê</a>
            <a href="/#ve-chung-toi">Về chúng tôi</a>
            <a href="#lien-he">Liên hệ</a>
            <span>
              <Icon name="verified" size={14} /> Kiểm tra kỹ lưỡng trước bàn
              giao
            </span>
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer" id="lien-he">
        <div className="site-container">
          <div className="footer-grid">
            <div>
              <Link className="brand" to="/">
                <span className="brand-mark">
                  <Icon name="monitor" size={22} />
                </span>
                <span>
                  Tech<span className="brand-accent">Rental</span>
                </span>
              </Link>
              <p>
                Thiết bị công nghệ phù hợp cho công việc của bạn. Lựa chọn linh
                hoạt, thông tin rõ ràng.
              </p>
              <span className="footer-note">
                <Icon name="shield" size={15} /> Đồng hành từ lựa chọn đến bàn
                giao
              </span>
            </div>
            <div>
              <h3>Danh mục thiết bị</h3>
              {["Máy tính", "Máy chiếu", "Máy in", "Máy chủ", "Màn hình"].map(
                (name) => (
                  <Link
                    key={name}
                    to={`/thiet-bi?categoryName=${encodeURIComponent(name)}`}
                  >
                    {name}
                  </Link>
                ),
              )}
            </div>
            <div>
              <h3>Thông tin & chính sách</h3>
              <a href="/#quy-trinh">Quy trình thuê thiết bị</a>
              <button onClick={() => setInfo("policy")}>
                Điều kiện thuê & tiền cọc
              </button>
              <a href="/#ve-chung-toi">Về TechRental</a>
            </div>
            <div>
              <h3>Kết nối với TechRental</h3>
              <p>
                Hotline, địa chỉ và email sẽ được cập nhật khi dịch vụ chính
                thức hoạt động.
              </p>
              <span className="contact-status">
                <span className="status-dot" /> Website đang trong giai đoạn
                phát triển
              </span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} TechRental. Thiết bị tốt, giải pháp
              hay.
            </span>
            <span>Hình ảnh và giá thuê mang tính minh họa.</span>
          </div>
        </div>
      </footer>
      {info && (
        <Modal
          title={
            info === "account"
              ? "Tài khoản TechRental"
              : "Điều kiện thuê & tiền cọc"
          }
          onClose={() => setInfo("")}
        >
          <p className="modal-notice">
            {info === "account"
              ? "Khu vực tài khoản đang được hoàn thiện. Bạn có thể tiếp tục tham khảo thiết bị và giá thuê."
              : "Tiền cọc tham khảo hiển thị theo từng thiết bị. Giá thuê, lịch trống và điều khoản bàn giao cần được xác nhận trước khi thuê."}
          </p>
          <button className="button modal-done" onClick={() => setInfo("")}>
            Đã hiểu
          </button>
        </Modal>
      )}
    </div>
  );
}
