import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StoreLayout from "../components/layout/StoreLayout.jsx";
import DeviceCard, {
  ProductVisual,
  formatMoney,
} from "../components/catalog/DeviceCard.jsx";
import Icon from "../components/ui/Icon.jsx";
import Modal from "../components/ui/Modal.jsx";
import { apiRequest } from "../services/api.js";
import "../styles/home.css";
import "../styles/catalog.css";

const fallbackCategories = [
  "Máy tính",
  "Máy chiếu",
  "Máy in",
  "Máy chủ",
  "Màn hình",
].map((name) => ({ name }));
const configFilters = [
  ["spec.CPU", "Bộ xử lý", ["Intel Core i5", "Intel Xeon"]],
  ["spec.RAM", "Bộ nhớ RAM", ["16 GB", "32 GB", "64 GB"]],
  ["spec.SSD", "Ổ cứng SSD", ["256 GB", "512 GB", "2 TB"]],
  ["spec.resolution", "Độ phân giải", ["Full HD", "4K"]],
];
const priceRanges = [
  ["", "", "Tất cả mức giá"],
  ["0", "150000", "Đến 150.000đ"],
  ["150001", "300000", "150.001 – 300.000đ"],
  ["300001", "", "Trên 300.000đ"],
];
const titles = {
  q: "Tìm kiếm",
  categoryName: "Loại",
  minPrice: "Giá từ",
  maxPrice: "Giá đến",
  configuration: "Cấu hình",
  status: "Trạng thái",
  "spec.CPU": "CPU",
  "spec.RAM": "RAM",
  "spec.SSD": "SSD",
  "spec.resolution": "Độ phân giải",
};

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState(fallbackCategories);
  const [result, setResult] = useState({ data: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rent, setRent] = useState(false);
  const [search, setSearch] = useState(params.get("q") || "");
  const [configuration, setConfiguration] = useState(
    params.get("configuration") || "",
  );
  const [min, setMin] = useState(params.get("minPrice") || "");
  const [max, setMax] = useState(params.get("maxPrice") || "");
  const [priceError, setPriceError] = useState("");
  const resultsRef = useRef(null);
  const signature = params.toString();
  const page = Number(params.get("page") || 1);
  const limit = Number(params.get("limit") || 9);
  const querySearch = params.get('q') || '';
  const queryConfiguration = params.get('configuration') || '';
  const queryMin = params.get('minPrice') || '';
  const queryMax = params.get('maxPrice') || '';
  // Unrelated URL filters must not clear a price the user is currently entering.
  useEffect(() => { setSearch(querySearch); }, [querySearch]);
  useEffect(() => { setConfiguration(queryConfiguration); }, [queryConfiguration]);
  useEffect(() => { setMin(queryMin); setPriceError(''); }, [queryMin]);
  useEffect(() => { setMax(queryMax); setPriceError(''); }, [queryMax]);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/categories", { signal: controller.signal })
      .then((response) => setCategories(response.data))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const current = new URLSearchParams(signature);
    setLoading(true);
    setError("");
    const controller = new AbortController();
    if (!current.has("limit")) current.set("limit", "9");
    apiRequest(`/devices?${current}`, { signal: controller.signal })
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setError(
            error.status === 400
              ? "Bộ lọc không hợp lệ. Hãy xóa bộ lọc và thử lại."
              : "Không thể tải danh sách thiết bị. Vui lòng thử lại.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [signature, retry]);

  function update(values) {
    const next = new URLSearchParams(params);
    next.delete("page");
    Object.entries(values).forEach(([key, value]) => {
      if (value === "" || value === undefined) next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next);
  }
  function changePage(number) {
    const next = new URLSearchParams(params);
    next.set("page", String(number));
    setParams(next);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function clearFilters() {
    setParams({});
    setFiltersOpen(false);
  }
  const active = Object.entries(titles).filter(([key]) => params.has(key));
  const pages = result.pagination.totalPages || 0;
  const pageNumbers = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((number) => number > 0 && number <= pages)
    .sort((a, b) => a - b);
  const total = result.pagination.total || 0;

  const filters = (prefix) => (
    <>
      <div className="filter-title">
        <h2>
          <Icon name="search" size={16} /> BỘ LỌC TÌM KIẾM
        </h2>
        <button onClick={clearFilters}>Đặt lại</button>
      </div>
      <fieldset className="filter-group">
        <legend>Tình trạng thiết bị</legend>
        {[
          ["", "Tất cả thiết bị"],
          ["available", "Có thể yêu cầu thuê"],
        ].map(([value, text]) => (
          <label className="filter-choice" key={value}>
            <input
              type="radio"
              name={`${prefix}-availability`}
              value={value}
              checked={(params.get("status") || "") === value}
              onChange={() => update({ status: value })}
            />
            <span>{text}</span>
            {value && <span className="green-dot" />}
          </label>
        ))}
      </fieldset>
      <fieldset className="filter-group">
        <legend>
          Danh mục thiết bị <span>{categories.length} loại</span>
        </legend>
        <label className="filter-choice">
          <input
            type="radio"
            name={`${prefix}-device-category`}
            value=""
            checked={!params.get("categoryName")}
            onChange={() => update({ categoryName: "" })}
          />
          <span>Tất cả danh mục</span>
        </label>
        {categories.map((category) => (
          <label className="filter-choice" key={category._id || category.name}>
            <input
              type="radio"
              name={`${prefix}-device-category`}
              value={category.name}
              checked={params.get("categoryName") === category.name}
              onChange={() => update({ categoryName: category.name })}
            />
            <span>{category.name}</span>
            <Icon
              name={
                category.name === "Máy chủ"
                  ? "server"
                  : category.name === "Máy in"
                    ? "printer"
                    : category.name === "Máy chiếu"
                      ? "projector"
                      : category.name === "Máy tính"
                        ? "laptop"
                        : "monitor"
              }
              size={14}
            />
          </label>
        ))}
      </fieldset>
      <form
        className="filter-group price-filter"
        onSubmit={(event) => {
          event.preventDefault();
          if (
            (min &&
              (!/^\d+$/.test(min) || !Number.isSafeInteger(Number(min)))) ||
            (max &&
              (!/^\d+$/.test(max) || !Number.isSafeInteger(Number(max)))) ||
            (min && max && Number(min) > Number(max))
          ) {
            setPriceError("Nhập giá hợp lệ; giá tối đa phải từ giá tối thiểu.");
            return;
          }
          setPriceError("");
          update({ minPrice: min, maxPrice: max });
        }}
      >
        <h3>
          Khoảng giá thuê <small>/ ngày</small>
        </h3>
        <div className="price-inputs">
          <label>
            Từ
            <input
              aria-label="Giá tối thiểu"
              type="number"
              min="0"
              step="1"
              value={min}
              onChange={(event) => setMin(event.target.value)}
              placeholder="0"
            />
          </label>
          <span>–</span>
          <label>
            Đến
            <input
              aria-label="Giá tối đa"
              type="number"
              min="0"
              step="1"
              value={max}
              onChange={(event) => setMax(event.target.value)}
              placeholder="Không giới hạn"
            />
          </label>
        </div>
        {priceError && (
          <p className="filter-error" role="alert">
            {priceError}
          </p>
        )}
        <button className="button price-apply">Áp dụng giá</button>
        <div className="price-shortcuts">
          {priceRanges.map(([from, to, label]) => (
            <button
              type="button"
              className={
                (params.get("minPrice") || "") === from &&
                (params.get("maxPrice") || "") === to
                  ? "chosen"
                  : ""
              }
              key={label}
              onClick={() => update({ minPrice: from, maxPrice: to })}
            >
              {label}
              <Icon name="right" size={12} />
            </button>
          ))}
        </div>
      </form>
      {configFilters.map(([key, label, values]) => (
        <fieldset className="filter-group" key={key}>
          <legend>{label}</legend>
          <div className="config-chips">
            {values.map((value) => (
              <button
                type="button"
                aria-pressed={params.get(key) === value}
                className={params.get(key) === value ? "chosen" : ""}
                key={value}
                onClick={() =>
                  update({ [key]: params.get(key) === value ? "" : value })
                }
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <form
        className="filter-group"
        onSubmit={(event) => {
          event.preventDefault();
          update({ configuration: configuration.trim() });
        }}
      >
        <label
          className="filter-text-label"
          htmlFor={`${prefix}-configuration-search`}
        >
          Cấu hình khác
        </label>
        <div className="configuration-search">
          <input
            id={`${prefix}-configuration-search`}
            maxLength={200}
            placeholder="HDMI, IPS, Laser..."
            value={configuration}
            onChange={(event) => setConfiguration(event.target.value)}
          />
          <button type="submit" aria-label="Lọc cấu hình">
            <Icon name="search" size={16} />
          </button>
        </div>
      </form>
      <div className="sidebar-help">
        <Icon name="support" size={28} />
        <h3>Khó chọn thiết bị?</h3>
        <p>Tham khảo quy trình và thông tin để chọn giải pháp phù hợp.</p>
        <a href="/#quy-trinh" className="button">
          Tìm hiểu quy trình <Icon name="arrow" size={13} />
        </a>
      </div>
    </>
  );

  return (
    <StoreLayout>
      <main>
        <section className="catalog-intro">
          <div className="site-container">
            <div className="breadcrumbs">
              <Link to="/">Trang chủ</Link>
              <Icon name="right" size={12} />
              <span>Danh mục thiết bị</span>
            </div>
            <div className="catalog-intro-row">
              <div>
                <p className="eyebrow">THIẾT BỊ PHÙ HỢP · CÔNG VIỆC HIỆU QUẢ</p>
                <h1>Danh mục thiết bị cho thuê toàn diện</h1>
                <p>
                  Từ văn phòng đến sự kiện, tìm thiết bị phù hợp với nhu cầu và
                  ngân sách của bạn.
                </p>
              </div>
              <div className="intro-assurances">
                <span>
                  <Icon name="truck" size={21} />
                  <strong>
                    Bàn giao rõ ràng<small>Kiểm tra trước khi nhận</small>
                  </strong>
                </span>
                <span>
                  <Icon name="shield" size={21} />
                  <strong>
                    Yên tâm sử dụng<small>Thông tin minh bạch</small>
                  </strong>
                </span>
              </div>
            </div>
            <div className="quick-category">
              <span>Khám phá nhanh:</span>
              <button
                className={!params.get("categoryName") ? "active" : ""}
                onClick={() => update({ categoryName: "" })}
              >
                Tất cả thiết bị
              </button>
              {categories.map((category) => (
                <button
                  key={category._id || category.name}
                  className={
                    params.get("categoryName") === category.name ? "active" : ""
                  }
                  onClick={() => update({ categoryName: category.name })}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>
        <div className="site-container catalog-layout">
          <aside className="catalog-sidebar" aria-label="Bộ lọc thiết bị">
            {filters("desktop")}
          </aside>
          <section
            className="catalog-results"
            aria-label="Kết quả thiết bị"
            ref={resultsRef}
          >
            <div className="results-toolbar">
              <div className="results-summary" role="status">
                {loading ? (
                  "Đang tìm thiết bị..."
                ) : error ? (
                  "Chưa tải được kết quả"
                ) : total ? (
                  <>
                    Hiển thị{" "}
                    <strong>
                      {Math.min((page - 1) * limit + 1, total)}–
                      {Math.min(page * limit, total)}
                    </strong>{" "}
                    trong <strong>{total}</strong> thiết bị
                  </>
                ) : (
                  "Không có kết quả phù hợp"
                )}
                <small>Tìm lựa chọn phù hợp cho công việc của bạn</small>
              </div>
              <form
                className="catalog-search results-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  update({ q: search.trim() });
                }}
              >
                <label className="sr-only" htmlFor="catalog-query">
                  Tìm tên hoặc mã thiết bị
                </label>
                <input
                  id="catalog-query"
                  maxLength={200}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tên, mã thiết bị..."
                />
                <button aria-label="Tìm thiết bị" type="submit">
                  <Icon name="search" size={16} />
                </button>
              </form>
              <label className="sort-control">
                <span>Sắp xếp:</span>
                <select
                  aria-label="Sắp xếp thiết bị"
                  value={params.get("sort") || "newest"}
                  onChange={(event) => update({ sort: event.target.value })}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá thấp đến cao</option>
                  <option value="price_desc">Giá cao đến thấp</option>
                  <option value="name_asc">Tên A–Z</option>
                </select>
              </label>
              <button
                className="button button-outline mobile-filter-button"
                onClick={() => setFiltersOpen(true)}
              >
                <Icon name="search" size={16} /> Bộ lọc{" "}
                {active.length > 0 && `(${active.length})`}
              </button>
            </div>
            {active.length > 0 && (
              <div className="applied-filters">
                <span>Đang lọc:</span>
                {active.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => update({ [key]: "" })}
                    aria-label={`Xóa bộ lọc ${label}`}
                  >
                    {label}:{" "}
                    {key === "status" ? "Có thể thuê" : params.get(key)}
                    <Icon name="close" size={12} />
                  </button>
                ))}
                <button className="clear-all" onClick={clearFilters}>
                  Xóa tất cả
                </button>
              </div>
            )}
            {loading ? (
              <div
                className="catalog-product-grid"
                aria-label="Đang tải thiết bị"
              >
                {Array.from({ length: 9 }, (_, index) => (
                  <div className="device-skeleton" key={index}>
                    <div />
                    <span />
                    <span />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="empty-state" role="alert">
                <Icon name="server" size={34} />
                <h2>Chưa tải được danh mục</h2>
                <p>{error}</p>
                <div className="empty-actions">
                  <button
                    className="button"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Thử lại
                  </button>
                  <button
                    className="button button-outline"
                    onClick={clearFilters}
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            ) : !result.data.length ? (
              <div className="empty-state">
                <Icon name="search" size={34} />
                <h2>Chưa tìm thấy thiết bị phù hợp</h2>
                <p>Hãy thử thay đổi cấu hình, khoảng giá hoặc loại thiết bị.</p>
                <button className="button" onClick={clearFilters}>
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="catalog-product-grid">
                {result.data.map((device) => (
                  <DeviceCard
                    key={device._id}
                    device={device}
                    onDetails={(device) => {
                      setSelected(device);
                      setRent(false);
                    }}
                    onRent={(device) => {
                      setSelected(device);
                      setRent(true);
                    }}
                  />
                ))}
              </div>
            )}
            {!loading && !error && total > 0 && (
              <div className="catalog-pagination">
                <label>
                  Hiển thị
                  <select
                    aria-label="Số thiết bị mỗi trang"
                    value={limit}
                    onChange={(event) => update({ limit: event.target.value })}
                  >
                    {[9, 18, 36].map((value) => (
                      <option key={value} value={value}>
                        {value} thiết bị / trang
                      </option>
                    ))}
                  </select>
                </label>
                <nav aria-label="Phân trang danh mục">
                  <button
                    className="page-button"
                    aria-label="Trang trước"
                    disabled={page <= 1}
                    onClick={() => changePage(page - 1)}
                  >
                    <Icon name="left" size={15} />
                  </button>
                  {pageNumbers.map((number, index) => (
                    <span key={number}>
                      {index > 0 && number - pageNumbers[index - 1] > 1 && (
                        <span className="page-ellipsis">…</span>
                      )}
                      <button
                        className={`page-button ${page === number ? "active" : ""}`}
                        aria-current={page === number ? "page" : undefined}
                        aria-label={`Trang ${number}`}
                        onClick={() => changePage(number)}
                      >
                        {number}
                      </button>
                    </span>
                  ))}
                  <button
                    className="page-button"
                    aria-label="Trang sau"
                    disabled={!result.pagination.hasNextPage}
                    onClick={() => changePage(page + 1)}
                  >
                    <Icon name="right" size={15} />
                  </button>
                </nav>
              </div>
            )}
            <p className="sample-note">
              Hình ảnh minh họa theo loại thiết bị. Lịch trống và chi phí thực
              tế được xác nhận khi duyệt yêu cầu.
            </p>
          </section>
        </div>
        <section className="catalog-commitments site-container">
          <div className="section-heading centered">
            <p className="eyebrow">RÕ RÀNG TỪ LỰA CHỌN ĐẾN BÀN GIAO</p>
            <h2>Yên tâm thuê thiết bị cùng TechRental</h2>
            <p>
              Thông tin minh bạch để bạn chủ động lựa chọn và an tâm sử dụng.
            </p>
          </div>
          <div>
            {[
              [
                "truck",
                "Bàn giao & kiểm tra",
                "Kiểm tra cấu hình và tình trạng thiết bị trước khi xác nhận bàn giao.",
              ],
              [
                "support",
                "Hỗ trợ khi cần",
                "Trao đổi nhu cầu sử dụng để tìm giải pháp thiết bị phù hợp.",
              ],
              [
                "shield",
                "Chi phí rõ ràng",
                "Giá thuê theo ngày và tiền cọc tham khảo được hiển thị theo từng thiết bị.",
              ],
            ].map(([icon, title, text]) => (
              <article key={title}>
                <span>
                  <Icon name={icon} size={25} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      {filtersOpen && (
        <Modal title="Bộ lọc thiết bị" onClose={() => setFiltersOpen(false)}>
          <div className="mobile-filter-content">{filters("mobile")}</div>
          <button
            className="button modal-done"
            onClick={() => setFiltersOpen(false)}
          >
            Xem kết quả
          </button>
        </Modal>
      )}
      {selected && (
        <Modal
          title={rent ? "Yêu cầu thuê thiết bị" : selected.name}
          onClose={() => setSelected(null)}
        >
          <p className="modal-eyebrow">
            {selected.assetCode} · {selected.category?.name}
          </p>
          <div className="modal-device">
            <ProductVisual device={selected} />
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
              <dd>{formatMoney(selected.rentalPricePerDay)}đ</dd>
            </div>
            <div>
              <dt>Tiền cọc tham khảo</dt>
              <dd>{formatMoney(selected.depositAmount)}đ</dd>
            </div>
            <div>
              <dt>Tình trạng</dt>
              <dd>{selected.condition || "Đang cập nhật"}</dd>
            </div>
          </dl>
          <p className="modal-notice">
            {rent
              ? "Chức năng gửi yêu cầu thuê đang được hoàn thiện. Bạn có thể tham khảo cấu hình, giá thuê và tiền cọc trước khi đặt thuê."
              : "Hình ảnh và giá mang tính minh họa. Khả dụng theo lịch cần được xác nhận trước khi thuê."}
          </p>
          <button
            className="button modal-done"
            onClick={() => setSelected(null)}
          >
            Đã hiểu
          </button>
        </Modal>
      )}
    </StoreLayout>
  );
}
