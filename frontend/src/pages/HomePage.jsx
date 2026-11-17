import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthButtons from "../components/ui/AuthButtons.jsx";
import FavoriteButton from '../components/ui/FavoriteButton.jsx';
import DeviceSearchBar from '../components/ui/DeviceSearchBar.jsx';
import { ProductVisual } from '../components/catalog/DeviceCard.jsx';
import Icon from "../components/ui/Icon.jsx";
import Modal from "../components/ui/Modal.jsx";
import { apiRequest } from "../services/api.js";
import "../styles/home.css";

const assets = {
  office: "/images/office.jpg",
  laptop: "/images/laptop.jpg",
  monitor: "/images/monitor.jpg",
  server: "/images/server.jpg",
};
const categories = [
  {
    name: "Máy tính",
    icon: "laptop",
    description: "Học tập và làm việc linh hoạt",
    price: "150.000",
    image: assets.laptop,
  },
  {
    name: "Máy chiếu",
    icon: "projector",
    description: "Trình chiếu rõ nét, kết nối dễ dàng",
    price: "250.000",
  },
  {
    name: "Máy in",
    icon: "printer",
    description: "In ấn tài liệu, vận hành ổn định",
    price: "200.000",
  },
  {
    name: "Máy chủ",
    icon: "server",
    description: "Hiệu năng cho mọi dự án",
    price: "600.000",
    image: assets.server,
  },
  {
    name: "Màn hình",
    icon: "monitor",
    description: "Mở rộng không gian làm việc",
    price: "100.000",
    image: assets.monitor,
  },
];
const steps = [
  [
    "search",
    "Tìm kiếm thiết bị",
    "Chọn thiết bị và cấu hình phù hợp với công việc của bạn.",
  ],
  [
    "calendar",
    "Gửi yêu cầu thuê",
    "Chọn thời gian, số lượng và để lại nhu cầu sử dụng.",
  ],
  [
    "clipboard",
    "Xác nhận yêu cầu",
    "Thống nhất cấu hình, chi phí và lịch bàn giao thiết bị.",
  ],
  [
    "truck",
    "Nhận & kiểm tra",
    "Nhận thiết bị, kiểm tra tình trạng và bắt đầu sử dụng.",
  ],
  [
    "package",
    "Hoàn trả thiết bị",
    "Bàn giao lại thiết bị và hoàn tất hợp đồng thuê.",
  ],
];
const money = (value) => new Intl.NumberFormat("vi-VN").format(value ?? 0);
const categoryFor = (name) =>
  categories.find((category) => category.name === name) || categories[0];

function DeviceVisual({ category }) {
  if (category.image)
    return (
      <img
        className="device-image"
        src={category.image}
        alt={category.name}
        loading="lazy"
      />
    );
  return (
    <div className="device-illustration">
      <div className="illustration-orbit" />
      <Icon name={category.icon} size={92} />
      <span>
        {category.name === "Máy in"
          ? "PRINT · SCAN · WORK"
          : "CONNECT · PRESENT · INSPIRE"}
      </span>
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [info, setInfo] = useState("");
  const catalogRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: "8",
      page: String(page),
      sort,
    });
    if (activeCategory) params.set("categoryName", activeCategory);
    if (query) params.set("q", query);
    apiRequest(`/devices?${params}`, { signal: controller.signal })
      .then((data) => {
        setResult(data);
        setError("");
        setLoading(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setError(
            "Chưa tải được thiết bị. Vui lòng kiểm tra kết nối và thử lại.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [activeCategory, query, page, sort, retry]);
  const resetLoading = () => {
    setLoading(true);
    setError("");
  };
  const chooseCategory = (name) => {
    resetLoading();
    setActiveCategory(name);
    setPage(1);
    setRetry((value) => value + 1);
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="rental-site">
      <div className="announcement">
        <div className="site-container">
          <span>
            <Icon name="shield" size={14} /> Thiết bị sẵn sàng. Công việc trọn
            vẹn.
          </span>
          <span className="announcement-right">
            Cho thuê linh hoạt theo ngày · Hỗ trợ tận tâm
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="site-container header-inner">
          <a className="brand" href="#" aria-label="TechRental - Trang chủ">
            <span className="brand-mark">
              <Icon name="monitor" size={23} />
            </span>
            <span>
              Tech<span className="brand-accent">Rental</span>
              <small>THIẾT BỊ TỐT · GIẢI PHÁP HAY</small>
            </span>
          </a>
          <nav
            className={menuOpen ? "main-nav is-open" : "main-nav"}
            aria-label="Điều hướng chính"
          >
            {[
              ["#", "Trang chủ"],
              ["/thiet-bi", "Danh mục thiết bị"],
              ["#quy-trinh", "Quy trình thuê"],
              ["#ve-chung-toi", "Về chúng tôi"],
              ["#lien-he", "Liên hệ"],
            ].map(([href, label], index) => (
              <a
                key={href}
                className={index === 0 ? "current" : ""}
                href={href}
                onClick={() => setMenuOpen(false)}
              >
                {label}
                {index === 1 && <Icon name="down" size={13} />}
              </a>
            ))}
          </nav>
          <AuthButtons />
          <button
            className="icon-button menu-toggle"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </header>
      <div className="home-device-search"><div className="site-container"><DeviceSearchBar /></div></div>
      <main>
        <section className="hero">
          <div className="site-container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow hero-eyebrow">
                <span className="status-dot" /> GIẢI PHÁP THIẾT BỊ CHO MỌI NHU
                CẦU
              </div>
              <h1>
                Thiết bị bạn cần.
                <br />
                <span>Hiệu quả bạn muốn.</span>
              </h1>
              <p>
                Dịch vụ cho thuê thiết bị công nghệ linh hoạt. Từ máy tính, máy
                chiếu đến máy chủ — sẵn sàng đồng hành cùng công việc của bạn.
              </p>
              <div className="hero-actions">
                <a className="button" href="/thiet-bi">
                  Khám phá thiết bị <Icon name="arrow" size={18} />
                </a>
                <a className="button button-white" href="#quy-trinh">
                  <Icon name="clipboard" size={17} /> Quy trình thuê
                </a>
              </div>
              <div className="hero-benefits">
                {[
                  [
                    "shield",
                    "Kiểm tra kỹ lưỡng",
                    "Thiết bị trước mỗi lần giao",
                  ],
                  ["support", "Hỗ trợ tận tâm", "Đồng hành khi sử dụng"],
                  ["calendar", "Thuê linh hoạt", "Theo nhu cầu của bạn"],
                ].map(([icon, title, text]) => (
                  <div key={title}>
                    <span className="benefit-icon">
                      <Icon name={icon} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-media">
              <div className="hero-photo-wrap">
                <img
                  src={assets.office}
                  alt="Không gian làm việc hiện đại với thiết bị công nghệ"
                  fetchPriority="high"
                />
                <span className="photo-label">
                  <span className="status-dot" /> Sẵn sàng cho không gian làm
                  việc của bạn
                </span>
              </div>
              <div className="hero-media-footer">
                <span className="benefit-icon">
                  <Icon name="truck" size={23} />
                </span>
                <div>
                  <strong>Từ thiết bị đến giải pháp</strong>
                  <small>Chọn đúng cấu hình, tối ưu chi phí.</small>
                </div>
                <span className="tiny-badge">LINH HOẠT</span>
              </div>
              <div className="floating-note">
                <span>
                  <Icon name="verified" size={18} />
                </span>
                <div>
                  Chất lượng được kiểm tra
                  <small>Yên tâm trong từng trải nghiệm</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="danh-muc" className="categories-section section-space">
          <div className="site-container">
            <div className="section-heading centered">
              <p className="eyebrow">ĐA DẠNG THIẾT BỊ · LINH HOẠT LỰA CHỌN</p>
              <h2>Mọi thiết bị. Một điểm đến.</h2>
              <p>
                Giải pháp công nghệ phù hợp cho học tập, văn phòng, sự kiện và
                những dự án tiếp theo.
              </p>
            </div>
            <div className="category-grid">
              {categories.map((category) => (
                <button
                  className={`category-card ${activeCategory === category.name ? "selected" : ""}`}
                  key={category.name}
                  onClick={() => chooseCategory(category.name)}
                >
                  <span className="category-icon">
                    <Icon name={category.icon} size={27} />
                  </span>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                  <span className="category-price">
                    Từ {category.price}đ/ngày <Icon name="arrow" size={13} />
                  </span>
                </button>
              ))}
            </div>
            <p className="sample-note">
              Giá tham khảo từ danh mục mẫu. Giá thực tế được xác nhận khi tiếp
              nhận yêu cầu.
            </p>
          </div>
        </section>

        <section
          id="thiet-bi"
          className="catalog-section section-space"
          ref={catalogRef}
        >
          <div className="site-container">
            <div className="catalog-heading">
              <div className="section-heading">
                <p className="eyebrow">THIẾT BỊ PHÙ HỢP CHO KẾ HOẠCH CỦA BẠN</p>
                <h2>Khám phá thiết bị cho thuê</h2>
                <p>Cấu hình rõ ràng. Chi phí minh bạch. Dễ dàng lựa chọn.</p>
              </div>
              <a href="#quy-trinh" className="text-link">
                Thuê thiết bị như thế nào? <Icon name="arrow" size={16} />
              </a>
            </div>
            <div className="catalog-toolbar">
              <div className="category-tabs" aria-label="Lọc loại thiết bị">
                {["", ...categories.map((category) => category.name)].map(
                  (name) => (
                    <button
                      key={name}
                      className={name === activeCategory ? "active" : ""}
                      aria-pressed={name === activeCategory}
                      onClick={() => chooseCategory(name)}
                    >
                      {name || "Tất cả"}
                    </button>
                  ),
                )}
              </div>
              <form
                className="catalog-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  resetLoading();
                  setQuery(search.trim());
                  setPage(1);
                  setRetry((value) => value + 1);
                }}
              >
                <label className="sr-only" htmlFor="device-search">
                  Tìm tên hoặc mã thiết bị
                </label>
                <input
                  id="device-search"
                  maxLength={200}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm thiết bị..."
                />
                <button type="submit" aria-label="Tìm kiếm">
                  <Icon name="search" size={18} />
                </button>
              </form>
            </div>
            <div className="catalog-meta">
              <span aria-live="polite">
                {loading
                  ? "Đang tải thiết bị..."
                  : error
                    ? "Kết nối gián đoạn"
                    : `${result.pagination.total ?? 0} thiết bị${query ? ` cho “${query}”` : ""}`}
              </span>
              <label>
                Sắp xếp:{" "}
                <select
                  aria-label="Sắp xếp thiết bị"
                  value={sort}
                  onChange={(event) => {
                    resetLoading();
                    setSort(event.target.value);
                    setPage(1);
                    setRetry((value) => value + 1);
                  }}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá thấp đến cao</option>
                  <option value="price_desc">Giá cao đến thấp</option>
                  <option value="name_asc">Tên A–Z</option>
                </select>
              </label>
            </div>
            {loading ? (
              <div className="device-grid" aria-label="Đang tải">
                {Array.from({ length: 8 }, (_, index) => (
                  <div className="device-skeleton" key={index}>
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="empty-state" role="alert">
                <Icon name="server" size={36} />
                <h3>Chưa kết nối được danh mục</h3>
                <p>{error}</p>
                <button
                  className="button"
                  onClick={() => {
                    resetLoading();
                    setRetry((value) => value + 1);
                  }}
                >
                  Thử lại
                </button>
              </div>
            ) : result.data.length === 0 ? (
              <div className="empty-state">
                <Icon name="search" size={36} />
                <h3>Chưa tìm thấy thiết bị phù hợp</h3>
                <p>Thử tìm bằng tên khác hoặc xem tất cả danh mục.</p>
                <button
                  className="button"
                  onClick={() => {
                    setSearch("");
                    setQuery("");
                    chooseCategory("");
                  }}
                >
                  Xem tất cả thiết bị
                </button>
              </div>
            ) : (
              <div className="device-grid">
                {result.data.map((device) => {
                  const category = categoryFor(device.category?.name);
                  const available = device.status === "available" && (device.stockQuantity ?? 1) > 0;
                  return (
                    <article className="device-card" key={device._id}>
                      <div className="device-visual">
                        <FavoriteButton device={device} compact />
                        {device.images?.length ? <ProductVisual device={device} /> : <DeviceVisual category={category} />}
                        <span
                          className={`availability ${available ? "" : "unavailable"}`}
                        >
                          <span />
                          {available
                            ? "Có thể yêu cầu thuê"
                            : "Hiện chưa sẵn sàng"}
                        </span>
                        <span className="asset-code">{device.assetCode}</span>
                      </div>
                      <div className="device-body">
                        <p className="device-category">
                          {device.category?.name}
                        </p>
                        <h3>{device.name}</h3>
                        <p className="device-specs">
                          {Object.entries(device.specifications || {})
                            .slice(0, 3)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" · ") || "Liên hệ để được tư vấn cấu hình"}
                        </p>
                        <div className="device-price">
                          <span>Giá thuê từ</span>
                          <strong>
                            {money(device.rentalPricePerDay)}
                            <small>đ/ngày</small>
                          </strong>
                        </div>
                        <div className="device-actions">
                          <Link
                            className="button button-outline"
                            to={`/thiet-bi/${device._id}`}
                          >
                            Xem chi tiết
                          </Link>
                          <button
                            className="button"
                            disabled={!available}
                            onClick={() => {
                              setSelected(device);
                              setInfo("rental");
                            }}
                          >
                            Yêu cầu thuê <Icon name="arrow" size={13} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {!loading && !error && result.pagination.totalPages > 1 && (
              <nav className="pagination" aria-label="Phân trang thiết bị">
                <button
                  className="button button-outline"
                  disabled={page === 1}
                  onClick={() => {
                    resetLoading();
                    setPage(page - 1);
                    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Icon name="left" size={16} /> Trước
                </button>
                <span>
                  Trang <strong>{page}</strong> / {result.pagination.totalPages}
                </span>
                <button
                  className="button button-outline"
                  disabled={!result.pagination.hasNextPage}
                  onClick={() => {
                    resetLoading();
                    setPage(page + 1);
                    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Tiếp <Icon name="right" size={16} />
                </button>
              </nav>
            )}
            <p className="sample-note">
              Hình ảnh minh họa theo loại thiết bị. Lịch trống sẽ được xác nhận
              khi duyệt yêu cầu.
            </p>
          </div>
        </section>

        <section id="quy-trinh" className="process-section section-space">
          <div className="site-container">
            <div className="section-heading centered">
              <p className="eyebrow">ĐƠN GIẢN · MINH BẠCH · CHỦ ĐỘNG</p>
              <h2>Thuê thiết bị, nhẹ nhàng trong 5 bước</h2>
              <p>
                Từ lựa chọn đến hoàn trả, mọi bước đều rõ ràng để bạn yên tâm
                tập trung vào công việc.
              </p>
            </div>
            <div className="process-grid">
              {steps.map(([icon, title, text], index) => (
                <article className="process-card" key={title}>
                  <span className="step-number">0{index + 1}</span>
                  <Icon name={icon} size={27} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="support-strip">
              <span className="support-strip-icon">
                <Icon name="support" size={28} />
              </span>
              <div>
                <h3>Chưa biết thiết bị nào phù hợp?</h3>
                <p>
                  Hãy chia sẻ nhu cầu, chúng tôi sẽ giúp bạn lựa chọn cấu hình
                  phù hợp.
                </p>
              </div>
              <a href="#lien-he" className="button">
                Tìm hiểu cách liên hệ <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
        </section>

        <section id="ve-chung-toi" className="about-section section-space">
          <div className="site-container">
            <div className="section-heading centered">
              <p className="eyebrow">CÔNG NGHỆ PHỤC VỤ CÔNG VIỆC</p>
              <h2>Thêm linh hoạt. Bớt lo lắng.</h2>
              <p>
                Chúng tôi hướng đến trải nghiệm thuê thiết bị thuận tiện, rõ
                ràng và phù hợp với nhu cầu thực tế.
              </p>
            </div>
            <div className="values-grid">
              {[
                [
                  "shield",
                  "Yên tâm về chất lượng",
                  "Thiết bị được kiểm tra trước bàn giao, thông tin cấu hình và tình trạng được trao đổi rõ ràng.",
                ],
                [
                  "calendar",
                  "Chủ động theo nhu cầu",
                  "Lựa chọn loại thiết bị và thời gian sử dụng phù hợp, từ công việc hằng ngày đến dự án ngắn hạn.",
                ],
                [
                  "support",
                  "Luôn có người đồng hành",
                  "Tiếp nhận nhu cầu sử dụng và hỗ trợ giải đáp để bạn lựa chọn giải pháp thiết bị phù hợp.",
                ],
              ].map(([icon, title, text]) => (
                <article className="value-card" key={title}>
                  <span className="value-icon">
                    <Icon name={icon} size={25} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="brand-strip">
              <p>ĐỒNG HÀNH CÙNG NHỮNG CÔNG NGHỆ QUEN THUỘC</p>
              <div>
                <span>DELL</span>
                <span>HP</span>
                <span>Lenovo</span>
                <span>EPSON</span>
                <span>ASUS</span>
                <span>Canon</span>
              </div>
              <small>
                Tên thương hiệu mang tính tham khảo, không hàm ý quan hệ đối
                tác.
              </small>
            </div>
          </div>
        </section>
      </main>
      <footer id="lien-he" className="site-footer">
        <div className="site-container">
          <div className="footer-grid">
            <div>
              <a className="brand" href="#">
                <span className="brand-mark">
                  <Icon name="monitor" size={23} />
                </span>
                <span>
                  Tech<span className="brand-accent">Rental</span>
                </span>
              </a>
              <p>
                Giải pháp thuê thiết bị công nghệ linh hoạt cho học tập, làm
                việc và những ý tưởng mới.
              </p>
              <span className="footer-note">
                <Icon name="shield" size={16} /> Rõ ràng từ lựa chọn đến bàn
                giao
              </span>
            </div>
            <div>
              <h3>Khám phá thiết bị</h3>
              {categories.map((category) => (
                <a
                  key={category.name}
                  href="#thiet-bi"
                  onClick={() => chooseCategory(category.name)}
                >
                  {category.name}
                </a>
              ))}
            </div>
            <div>
              <h3>Thông tin hữu ích</h3>
              <a href="#quy-trinh">Quy trình thuê thiết bị</a>
              <button onClick={() => setInfo("policy")}>
                Điều kiện thuê & tiền cọc
              </button>
              <a href="#ve-chung-toi">Về TechRental</a>
              <button onClick={() => setInfo("account")}>
                Tài khoản khách thuê
              </button>
            </div>
            <div>
              <h3>Kết nối với chúng tôi</h3>
              <p>
                Thông tin hotline, email và địa chỉ sẽ được cập nhật khi dịch vụ
                chính thức hoạt động.
              </p>
              <span className="contact-status">
                <span className="status-dot" /> Website đang trong giai đoạn
                phát triển
              </span>
              <a className="text-link" href="#thiet-bi">
                Khám phá danh mục <Icon name="arrow" size={15} />
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} TechRental. Hệ thống cho thuê thiết
              bị công nghệ.
            </span>
            <span>Được xây dựng để công việc đơn giản hơn.</span>
          </div>
        </div>
      </footer>
      {selected && (
        <Modal
          title={info === "rental" ? "Yêu cầu thuê thiết bị" : selected.name}
          onClose={() => {
            setSelected(null);
            setInfo("");
          }}
        >
          <p className="modal-eyebrow">
            {selected.assetCode} · {selected.category?.name}
          </p>
          <div className="modal-device">
            <DeviceVisual category={categoryFor(selected.category?.name)} />
          </div>
          <h3>{selected.name}</h3>
          <dl className="spec-list">
            {Object.entries(selected.specifications || {}).map(
              ([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ),
            )}
            <div>
              <dt>Giá thuê/ngày</dt>
              <dd>{money(selected.rentalPricePerDay)}đ</dd>
            </div>
            <div>
              <dt>Tiền cọc tham khảo</dt>
              <dd>{money(selected.depositAmount)}đ</dd>
            </div>
            <div>
              <dt>Tình trạng</dt>
              <dd>{selected.condition || "Đang cập nhật"}</dd>
            </div>
          </dl>
          <p className="modal-notice">
            {info === "rental"
              ? "Chức năng gửi yêu cầu thuê đang được phát triển. Hiện bạn có thể tham khảo thiết bị, cấu hình và giá thuê."
              : "Giá và hình ảnh là dữ liệu minh họa. Lịch trống và chi phí thực tế cần được xác nhận trước khi thuê."}
          </p>
          <button
            className="button modal-done"
            onClick={() => {
              setSelected(null);
              setInfo("");
            }}
          >
            Đã hiểu <Icon name="check" size={16} />
          </button>
        </Modal>
      )}
      {info && !selected && (
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
              ? "Khu vực tài khoản đang được hoàn thiện. Bạn có thể tiếp tục khám phá thiết bị và tham khảo thông tin thuê trong thời gian này."
              : "Tiền cọc tham khảo được hiển thị trong chi tiết từng thiết bị. Điều khoản thuê, thời gian bàn giao và xử lý hư hỏng sẽ được thống nhất trước khi xác nhận yêu cầu."}
          </p>
          <button className="button modal-done" onClick={() => setInfo("")}>
            Đã hiểu
          </button>
        </Modal>
      )}
    </div>
  );
}
