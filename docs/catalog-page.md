# Trang danh mục sản phẩm

Đường dẫn `/thiet-bi` (alias `/devices`). Từ trang chủ, chọn Danh mục thiết bị hoặc Khám phá thiết bị.

## Chức năng

- Bố cục theo ảnh tham khảo: header tìm kiếm, breadcrumb, loại truy cập nhanh, sidebar bộ lọc, lưới 3 cột, phân trang và cam kết dịch vụ.
- Danh mục lấy từ GET /api/v1/categories; khi chưa tải được, phần giới thiệu dự phòng hiển thị 5 loại của dự án, không bịa số lượng thiết bị.
- Thiết bị lấy từ GET /api/v1/devices: tìm tên/mã; chọn một danh mục; lọc tình trạng available; giá thuê/ngày với khoảng tự nhập hoặc khoảng nhanh; CPU/RAM/SSD/độ phân giải và tìm văn bản cấu hình khác.
- Các bộ lọc kết hợp AND; mỗi trường cấu hình chọn một giá trị. Lọc cấu hình là tìm văn bản, không so sánh dung lượng số.
- URL lưu bộ lọc, trang và sắp xếp; hỗ trợ reload, chia sẻ URL, Back/Forward. Thay bộ lọc tự trở về trang đầu.
- Mặc định 9 thiết bị/trang, có thể chọn 18 hoặc 36. Sắp xếp mới nhất, giá tăng/giảm, tên A–Z.
- Hộp chi tiết có cấu hình, giá và tiền cọc. Yêu cầu thuê chưa gửi dữ liệu vì nghiệp vụ đặt thuê chưa triển khai.
- Responsive: sidebar desktop, dialog bộ lọc trên điện thoại. Có loading, lỗi/thử lại, kết quả rỗng và kiểm tra khoảng giá nhập ngược.

## Giới hạn dữ liệu

Hình ảnh minh họa dùng lại từ trang chủ, không phải ảnh từng tài sản. Chưa có trường thương hiệu và mục đích sử dụng trong model nên không hiển thị bộ lọc thương hiệu/mục đích như ảnh mẫu. Có thể bổ sung khi dữ liệu hỗ trợ. Tình trạng available là hiện trạng, chưa xác nhận lịch thuê theo khoảng ngày.

## Kiểm tra

Chạy frontend/backend bằng `npm.cmd run dev`. Kiểm tra UI bằng `npm.cmd run test:e2e -w frontend` khi Vite đang hoạt động. Test danh mục kiểm tra kết hợp bộ lọc, URL/reload/Back, phân trang, giá sai, sắp xếp, tình trạng, chi tiết và bộ lọc mobile. Backend có test cho query status mới.
