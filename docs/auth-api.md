# Đăng ký, đăng nhập và phân quyền

Các vai trò: `renter` (khách thuê), `staff` (nhân viên), `admin` (quản trị). Vai trò borrower/manager trong tài liệu ban đầu đã được thay bằng ba vai trò theo yêu cầu mới. Nếu có tài khoản cũ dùng borrower/manager thì cần chuyển vai trò bằng kế hoạch migration riêng; mã này không tự sửa dữ liệu cũ.

## API

| Method | Endpoint | Quyền |
| --- | --- | --- |
| POST | /api/v1/auth/register | Công khai, chỉ tạo renter |
| POST | /api/v1/auth/login | Công khai |
| GET | /api/v1/auth/me | Tài khoản đã đăng nhập và còn hoạt động |
| POST | /api/v1/users | Chỉ admin, tạo renter/staff/admin |
| GET | /api/v1/users | Chỉ admin, lấy tối đa 100 tài khoản đầu |

Đăng ký:

```json
{"fullName":"Nguyễn Văn An","email":"an@example.com","password":"YourOwnPassword123"}
```

Đăng nhập chỉ gửi `email` và `password`. Tự đăng ký không được gửi role, isActive hoặc passwordHash. Email được trim và chuyển chữ thường. Mật khẩu dài 8–128 ký tự, không bị trim. Đăng ký thành công trả 201; đăng nhập trả 200:

```json
{
  "user":{"_id":"...","fullName":"Nguyễn Văn An","email":"an@example.com","role":"renter","isActive":true},
  "accessToken":"...",
  "tokenType":"Bearer",
  "expiresIn":3600
}
```

Gửi token bằng `Authorization: Bearer TOKEN`. Token HS256 có issuer, audience, subject và hết hạn sau một giờ; không có refresh token. JWT không lưu mật khẩu hoặc quyền; middleware đọc quyền hiện tại từ database mỗi lần gọi. Tài khoản bị xóa hoặc isActive=false mất quyền truy cập ngay. Chưa có API khóa tài khoản, đổi quyền, quên mật khẩu hay giao diện auth.

Theo yêu cầu của chủ dự án, tài khoản tạo mới lưu mật khẩu nguyên văn trong trường `password`, giữ cả khoảng trắng. Người đọc được MongoDB có thể thấy mật khẩu. API không trả `password` hoặc `passwordHash`; truy vấn mặc định ẩn hai trường này. Tài khoản cũ có `passwordHash` vẫn đăng nhập bằng scrypt; không thể khôi phục mật khẩu gốc từ giá trị băm. JWT_SECRET phải có ít nhất 32 byte; backend kiểm tra trước khởi động. Không commit backend/.env. Đổi secret sẽ làm mất hiệu lực toàn bộ token đã cấp.

Mã lỗi: 400 input sai, 401 thiếu/sai/hết hạn token hoặc đăng nhập thất bại, 403 thiếu quyền, 409 email trùng, 429 vượt giới hạn. Register và login dùng chung giới hạn 20 lần/15 phút/IP trên một tiến trình. Khi triển khai nhiều instance cần shared rate-limit store; khi đặt sau reverse proxy cần cấu hình trust proxy theo hạ tầng cụ thể.

## Tạo admin đầu tiên

Từ thư mục gốc, chạy terminal tương tác:

```powershell
npm.cmd run create-admin -w backend
```

Nhập tên, email và mật khẩu (ẩn khi gõ). Script tạo tài khoản admin mới, không nâng quyền hay ghi đè tài khoản có sẵn. Không có tài khoản/mật khẩu mặc định. Sau đó đăng nhập admin và dùng POST /api/v1/users để tạo nhân viên:

```json
{"fullName":"Nhân viên kho","email":"staff@example.com","password":"YourOwnStaffPassword123","role":"staff"}
```

## Sử dụng middleware cho nghiệp vụ tiếp theo

```js
router.post('/handover', authenticate, authorize('staff', 'admin'), controller);
router.post('/rental-request', authenticate, authorize('renter'), controller);
```

Đây là ví dụ cách gắn middleware, chưa có endpoint handover hoặc rental-request. Những nghiệp vụ liên quan phiếu cá nhân còn cần kiểm tra quyền sở hữu. API thiết bị/danh mục vẫn là danh mục đọc công khai. Token cần được frontend gửi qua HTTPS khi triển khai; đăng xuất phía client xóa token, chưa có thu hồi từng token.
