# Thiết bị yêu thích

Người dùng đăng nhập có thể nhấn trái tim ở trang chủ, danh mục và chi tiết thiết bị để lưu/bỏ yêu thích. Liên kết **Yêu thích** trên thanh tài khoản mở `/yeu-thich`. Danh sách được lưu trong collection `favorites` của MongoDB, tách theo tài khoản và hiển thị thiết bị mới lưu trước. Trang danh sách hỗ trợ phân trang 20 thiết bị, xem chi tiết và chuyển đến biểu mẫu thuê.

API yêu cầu Bearer JWT:

- `GET /api/v1/favorites/ids`: mã thiết bị đã lưu của tài khoản hiện tại.
- `GET /api/v1/favorites?page=1`: thiết bị yêu thích cùng danh mục và thông tin giá hiện tại. Thiết bị đã xóa được bỏ khỏi kết quả.
- `PUT /api/v1/favorites/:deviceId`: lưu thiết bị; gọi nhiều lần không tạo trùng. Trả 404 nếu thiết bị không tồn tại.
- `DELETE /api/v1/favorites/:deviceId`: bỏ lưu; gọi nhiều lần vẫn thành công, kể cả thiết bị đã xóa.

Không nhận user ID từ client. Chỉ mục duy nhất `(user, device)` ngăn lưu trùng; backend đợi tạo chỉ mục trước khi nhận request. Đăng xuất xóa trạng thái yêu thích khỏi giao diện, không xóa dữ liệu trong MongoDB. Chưa đăng nhập thì nút lưu chuyển đến trang đăng nhập; người dùng chọn lại thiết bị sau khi đăng nhập.

Kiểm tra backend: `npm.cmd test`. Kiểm tra giao diện khi frontend đang chạy: `npm.cmd run test:e2e -w frontend -- favorites.spec.js`. Các kiểm tra tự động dùng dữ liệu giả lập, không sửa tài khoản hoặc thiết bị thật.
