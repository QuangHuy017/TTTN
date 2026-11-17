# Trang chủ TechRental

Giao diện React tại `/`, tham khảo bố cục ảnh người dùng cung cấp, dùng tông xanh dương với hero, 5 danh mục, danh sách thiết bị, quy trình 5 bước, giá trị dịch vụ và footer. Co giãn cho desktop/tablet/mobile; menu thu gọn trên màn hình nhỏ.

## Chạy

Từ thư mục gốc: `npm.cmd run dev`, mở http://localhost:5174. Cần backend và MongoDB để xem danh sách. Frontend không thay lỗi kết nối bằng dữ liệu sản phẩm giả.

## Chức năng hiện có

- Danh sách lấy từ GET /api/v1/devices, 8 thiết bị/trang.
- Lọc theo 5 loại, tìm tên/mã, sắp xếp giá hoặc tên, phân trang.
- Xem thông số, giá và tiền cọc trong dialog hỗ trợ Escape, focus và cuộn.
- Loading, lỗi/thử lại, kết quả rỗng, trạng thái thiết bị.
- Danh mục giới thiệu dùng 5 loại và giá tham khảo từ seed; danh sách và chi tiết dùng dữ liệu API. Khi đổi giá thật cần cập nhật phần giới thiệu hoặc xây dựng API tổng hợp giá.

Đặt thuê và khu vực tài khoản hiện hiển thị thông báo chưa sẵn sàng, chưa gửi yêu cầu hoặc xử lý thanh toán. Không có số hotline, địa chỉ, đánh giá khách hàng hay số lượng khách hàng được tự bịa. Phần đánh giá trong ảnh được thay bằng các giá trị dịch vụ. Tên thương hiệu minh họa không hàm ý quan hệ đối tác.

## Ảnh minh họa

Ảnh lưu trong frontend/public/images, không đại diện chính xác cho từng tài sản:

- office.jpg: https://images.unsplash.com/photo-1497366754035-f200968a6e72
- laptop.jpg: https://images.unsplash.com/photo-1496181133206-80ce9b88a853
- monitor.jpg: https://images.unsplash.com/photo-1527443224154-c4a3942d3acf
- server.jpg: https://images.unsplash.com/photo-1558494949-ef010cbdcc31

Máy in và máy chiếu dùng minh họa icon Lucide, chưa có ảnh sản phẩm. Nên bổ sung ảnh chụp thiết bị thực tế vào dữ liệu trước khi vận hành.

## Kiểm tra giao diện

Khi Vite đang chạy, dùng `npm.cmd run test:e2e -w frontend`. Test dùng API fixture để ổn định, kiểm tra lọc/tìm kiếm/phân trang, dialog, menu điện thoại và lỗi API/thử lại. Cấu hình dùng Edge trên Windows nếu có; môi trường khác cài Chromium với `npx playwright install chromium` trước khi chạy. Ngoài test fixture, đã kiểm tra thủ công bằng trình duyệt headless với API Atlas thật.
