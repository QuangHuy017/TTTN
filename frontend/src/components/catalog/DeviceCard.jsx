import Icon from "../ui/Icon.jsx";
import { Link } from "react-router-dom";
import FavoriteButton from '../ui/FavoriteButton.jsx';
export const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);
const visuals = {
  "Máy tính": { image: "/images/laptop.jpg", icon: "laptop" },
  "Máy chiếu": { icon: "projector" },
  "Máy in": { icon: "printer" },
  "Máy chủ": { image: "/images/server.jpg", icon: "server" },
  "Màn hình": { image: "/images/monitor.jpg", icon: "monitor" },
};
export function ProductVisual({ device, imageIndex = 0 }) {
  const image = device.images?.[imageIndex] || device.images?.[0];
  if (image?.url) return <img className="device-image" src={image.url} alt={device.name} loading="lazy" />;
  const visual = visuals[device.category?.name] || { icon: "monitor" };
  return visual.image ? (
    <img
      className="device-image"
      src={visual.image}
      alt={`Hình minh họa ${device.category?.name || device.name}`}
      loading="lazy"
    />
  ) : (
    <div className="device-illustration">
      <div className="illustration-orbit" />
      <Icon name={visual.icon} size={90} />
      <span>TECHRENTAL · WORK BETTER</span>
    </div>
  );
}
export default function DeviceCard({ device, onRent }) {
  const available = device.status === "available" && (device.stockQuantity ?? 1) > 0;
  return (
    <article className="device-card">
      <div className="device-visual">
        <FavoriteButton device={device} compact />
        <ProductVisual device={device} />
        <span className={`availability ${available ? "" : "unavailable"}`}>
          <span />
          {available ? "Có thể yêu cầu thuê" : "Hiện chưa sẵn sàng"}
        </span>
        <span className="asset-code">{device.assetCode}</span>
      </div>
      <div className="device-body">
        <p className="device-category">
          {device.category?.name || "Thiết bị công nghệ"}
        </p>
        <h3>{device.name}</h3>
        <ul className="catalog-spec-list">
          {Object.entries(device.specifications || {})
            .slice(0, 4)
            .map(([key, value]) => (
              <li key={key}>
                <Icon name="check" size={12} />
                <span>
                  {key}: {value}
                </span>
              </li>
            ))}
        </ul>
        <div className="device-price">
          <span>Giá thuê/ngày</span>
          <strong>
            {formatMoney(device.rentalPricePerDay)}
            <small>đ/ngày</small>
          </strong>
        </div>
        <p className="deposit-line">
          Cọc tham khảo: {formatMoney(device.depositAmount)}đ
        </p>
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
            onClick={() => onRent(device)}
          >
            <Icon name="calendar" size={13} /> Thuê ngay
          </button>
        </div>
      </div>
    </article>
  );
}
