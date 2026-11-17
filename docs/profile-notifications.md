# Tài khoản và thông báo

Trong `/tai-khoan`, người dùng cập nhật họ tên, số điện thoại, giới tính và ngày sinh. Các mục bổ sung có thể để trống. Ngày sinh lưu theo `YYYY-MM-DD`, không đổi ngày theo múi giờ và không được ở tương lai; số điện thoại được kiểm tra định dạng. Email đăng nhập và vai trò không thể sửa từ API hồ sơ.

- `GET /api/v1/auth/me`: thông tin tài khoản hiện tại; không có mật khẩu.
- `PATCH /api/v1/auth/me`: nhận một hoặc nhiều trường `fullName`, `phone`, `gender`, `birthDate`. Giới tính nhận `male`, `female`, `other`, `undisclosed` hoặc chuỗi rỗng.
- `POST /api/v1/auth/change-password`: nhận `currentPassword`, `newPassword`. Kiểm tra mật khẩu cũ, mật khẩu mới 8–128 ký tự, khác mật khẩu cũ. Giữ cách lưu mật khẩu nguyên văn theo yêu cầu trước đó của chủ dự án. Tăng `tokenVersion`, trả access token mới cho phiên hiện tại; token các phiên cũ không dùng được nữa. Tài khoản cũ dùng scrypt vẫn đổi mật khẩu được.

## Thông báo duyệt đơn

Khi admin duyệt yêu cầu có `borrower` (yêu cầu gửi khi khách đã đăng nhập), hệ thống tạo thông báo trong website cho đúng tài khoản đó. Thông báo và trạng thái đơn được ghi trong cùng transaction; chỉ mục duy nhất ngăn thông báo trùng. Yêu cầu của khách chưa đăng nhập không có tài khoản nhận thông báo; không tự ghép tài khoản theo email liên hệ.

Chuông thông báo trên thanh tài khoản hiển thị số chưa đọc. Dữ liệu cập nhật khi mở chuông, khi trở lại cửa sổ và mỗi 30 giây khi trang đang hiển thị. Nhấn thông báo để đánh dấu đã đọc và mở Đơn hàng của tôi. `/thong-bao` có danh sách phân trang và nút đánh dấu tất cả đã đọc.

- `GET /api/v1/notifications?page=1`: 20 thông báo/trang, cùng tổng số chưa đọc.
- `PATCH /api/v1/notifications/:id/read`: đánh dấu một thông báo của chính người dùng.
- `PATCH /api/v1/notifications/read-all`: đánh dấu tất cả thông báo của chính người dùng.

Các API đều yêu cầu đăng nhập; không nhận user ID từ client. Không gửi lại thông báo cho các đơn đã duyệt trước khi tính năng được triển khai. Các bài kiểm tra dùng dữ liệu giả lập, không đổi mật khẩu thật hoặc duyệt đơn thật.
