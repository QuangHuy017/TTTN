# Hệ thống quản lý đăng ký và mượn thiết bị

Bộ khung JavaScript: React + Vite + Tailwind CSS, Node.js + Express REST API, MongoDB + Mongoose.

## Chạy dự án

Cần Node.js >= 22.12 và MongoDB local hoặc Atlas. Tại D:\TTTN:

```powershell
npm.cmd install
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
npm.cmd run dev
```

Khởi động MongoDB trước, hoặc cấu hình MONGODB_URI trong backend/.env. Với môi trường mới, điền JWT_SECRET ngẫu nhiên ít nhất 32 byte trước khi chạy; môi trường local hiện đã có secret riêng.
Frontend: http://localhost:5174. API: http://localhost:5000/api/v1/health.
Dùng npm.cmd trên PowerShell để tránh lỗi chính sách thực thi npm.ps1.

## Cấu trúc

- frontend/src/app: ứng dụng và định tuyến.
- frontend/src/pages: trang tổng quan và trang khung phân hệ.
- frontend/src/components: ui, layout dùng chung.
- frontend/src/features: auth, devices, requests, loans, maintenance, notifications, reports, users.
- frontend/src/services: gọi API; hooks, contexts, utils, styles: mã dùng chung.
- backend/src/config: môi trường và kết nối MongoDB.
- backend/src/routes, controllers, middlewares: REST API và xử lý lỗi.
- backend/src/models: User, Category, Device, BorrowRequest.
- backend/src/services, validators, jobs, utils: điểm mở rộng nghiệp vụ.
- backend/tests: kiểm tra API và ràng buộc model.
- docs: kiến trúc, API, thiết kế Figma.
- .vscode: cấu hình và extensions đề xuất.
- .github/workflows/ci.yml: lint, test, build trên GitHub.

## Dữ liệu mẫu cho thuê

Sau khi cấu hình `MONGODB_URI` trong `backend/.env`, chạy từ thư mục gốc:

```powershell
npm.cmd run seed -w backend
```

Script thêm 5 danh mục (máy tính, máy chiếu, máy in, máy chủ, màn hình), mỗi danh mục 3 tài sản có mã `DEMO-`. Giá thuê/ngày và tiền cọc là dữ liệu minh họa bằng VND; cần điều chỉnh trước khi kinh doanh. Chạy lại giữ nguyên bản ghi đã tồn tại, không xóa dữ liệu. Nếu chạy bị gián đoạn, có thể chạy lại để thêm phần còn thiếu.

Với Atlas, dùng URI có tên database rõ ràng (ví dụ `equipment_loan`), tài khoản database có quyền đọc/ghi và cho phép địa chỉ IP của máy trong Network Access. Không commit `.env` hoặc gửi mật khẩu lên chat. Chức năng đặt thuê, tính tiền và thanh toán chưa được triển khai.

## Phạm vi bộ khung

Đã có [trang danh mục](http://localhost:5174/thiet-bi) theo ảnh tham khảo: bộ lọc bên trái, tìm tên/mã, loại thiết bị từ API, tình trạng, giá thuê, CPU/RAM/SSD/độ phân giải, sắp xếp, phân trang và chi tiết thiết bị. Bộ lọc lưu trên URL; điện thoại dùng hộp bộ lọc riêng. Xem [tài liệu danh mục](docs/catalog-page.md).

Đã có trang chủ TechRental theo ảnh tham khảo: danh mục, thiết bị từ API, tìm kiếm, lọc loại, sắp xếp, phân trang và xem chi tiết, responsive desktop/mobile. Chạy `npm.cmd run dev` và mở http://localhost:5174. Xem [hướng dẫn trang chủ](docs/homepage.md). Gửi yêu cầu thuê và giao diện tài khoản chưa triển khai.

Đã bổ sung đăng ký, đăng nhập JWT và phân quyền `renter`/`staff`/`admin`: xem [Auth API](docs/auth-api.md). Tạo admin đầu tiên bằng `npm.cmd run create-admin -w backend`. Chưa có giao diện đăng nhập/đăng ký. Cấu hình `JWT_SECRET` tối thiểu 32 byte khi tạo môi trường mới; file môi trường local đã được cấu hình secret riêng.

Đã bổ sung API đọc danh sách thiết bị, tìm kiếm, lọc danh mục/cấu hình/giá thuê và phân trang. Xem [hướng dẫn API thiết bị](docs/device-api.md) và các request trong `docs/api.http`. CRUD ghi dữ liệu chưa triển khai.

Đã có trang React gọi health API, điều hướng phân hệ, Express middleware và bốn model nền tảng. Các trang phân hệ là trang khung; chưa có CRUD thiết bị, xét duyệt, chống trùng lịch, bàn giao/trả, bảo trì, nhắc hạn hay báo cáo.

Kiểm tra: npm.cmd run lint, npm.cmd test, npm.cmd run build.
Chạy riêng: npm.cmd run dev:frontend hoặc npm.cmd run dev:backend.
Khi triển khai, cần cấu hình API cho frontend; proxy Vite chỉ phục vụ phát triển.

## Git, GitHub và Figma

Mã nguồn: [QuangHuy017/TTTN](https://github.com/QuangHuy017/TTTN). Tài liệu chức năng nằm trong thư mục `docs/`. Thêm link thiết kế Figma vào `docs/design/README.md` khi có.

Xem [kiến trúc](docs/architecture.md) và [API](docs/api.md).

Tài liệu: https://vite.dev/guide/ và https://tailwindcss.com/docs/installation/using-vite.
