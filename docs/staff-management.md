# Quản lý nhân viên

Admin mở `/admin/staff` hoặc chọn **Quản lý nhân viên** trong sidebar.

- **Thêm nhân viên**: họ tên, email đăng nhập, mật khẩu 8–128 ký tự, số điện thoại và trạng thái hoạt động. Backend luôn gán vai trò `staff`; không thể tạo admin qua form này.
- **Sửa**: cập nhật thông tin, email, số điện thoại, trạng thái. Ô mật khẩu mới để trống giữ nguyên mật khẩu hiện tại. Không hiển thị mật khẩu đang lưu.
- **Xóa**: có xác nhận, đánh dấu `deletedAt`, chuyển `isActive: false` và thu hồi phiên đăng nhập; gỡ khỏi danh sách nhân viên/tài khoản. Giữ bản ghi để lịch sử đơn thuê và tin nhắn vẫn tham chiếu được. Email của tài khoản đã xóa vẫn được giữ và không thể dùng cho tài khoản mới.
- Tìm kiếm theo tên, email hoặc số điện thoại, lọc hoạt động/đã khóa và phân trang 20 nhân viên.

Đổi email, đặt lại mật khẩu hoặc đổi trạng thái sẽ tăng `tokenVersion` để nhân viên đăng nhập lại. Đổi các thông tin khác không thu hồi phiên hiện tại. Nhân viên mới có thể đăng nhập và vào `/nhan-vien/tin-nhan` để trả lời khách hàng.

## API (chỉ admin)

- `GET /api/v1/admin/staff?page=1&q=...&active=true`: danh sách, không gồm tài khoản đã xóa.
- `POST /api/v1/admin/staff`: tạo nhân viên.
- `PATCH /api/v1/admin/staff/:id`: cập nhật một hoặc nhiều trường được phép.
- `DELETE /api/v1/admin/staff/:id`: xóa khỏi sử dụng, giữ lịch sử.

API chỉ nhận `fullName`, `email`, `phone`, `isActive`, `password`. Không chấp nhận sửa `role`, `deletedAt` hoặc `tokenVersion` từ client. Cập nhật/xóa chỉ khớp tài khoản `role: staff`, nên không thể dùng để sửa/xóa khách hàng hay admin. Tất cả response dùng danh sách trường cho phép, không chứa mật khẩu hoặc giá trị băm.

## Quyền nhân viên

Bộ phận đã được bỏ khỏi form, danh sách và API nhân viên. Mọi tài khoản `staff` có cùng bộ quyền:

- `/nhan-vien/quan-ly/devices`: thêm/sửa/xóa thiết bị, ảnh, giá và tồn kho.
- `/nhan-vien/quan-ly/requests`: tiếp nhận, duyệt/từ chối, xác nhận giao và nhận lại thiết bị.
- `/nhan-vien/tin-nhan`: đọc/trả lời tin nhắn khách hàng.

Nhân viên đăng nhập được chuyển đến trang quản lý thiết bị. Giao diện ẩn mục quản lý tài khoản và nhân viên; backend cũng chặn các API đó bằng 403. API `/admin/devices`, `/admin/device-images`, `/admin/requests` dùng chung cho `staff` và `admin`; `/admin/staff`, `/admin/users`, `/admin/overview` vẫn chỉ dành cho admin. Khách hàng không được truy cập những API này.
