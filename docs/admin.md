# Trang quản trị TechRental

Truy cập http://localhost:5174/admin và đăng nhập bằng tài khoản có vai trò `admin`. Sau khi đăng nhập, admin được chuyển đến trang quản trị; thanh tài khoản trên website cũng có liên kết **Quản trị**.

Nếu chưa có admin, chạy từ thư mục gốc:

```powershell
npm.cmd run create-admin -w backend
```

Script hỏi thông tin tài khoản trong terminal. Không đưa mật khẩu hoặc nội dung `.env` vào tài liệu.

## Chức năng

- `/admin`: tổng số thiết bị, thiết bị sẵn sàng, yêu cầu chờ duyệt, đơn đã duyệt/đang thuê, tài khoản và yêu cầu gần đây.
- `/admin/devices`: tìm tên/mã tài sản, phân trang, thêm/sửa thiết bị, tải ảnh, nhập mô tả và thông số theo danh mục. Form có trạng thái **Còn thiết bị**, **Đã cho thuê**, **Bảo trì**, **Thất lạc**, **Ngừng sử dụng**. Hai ô tiền cọc và vị trí đã được bỏ khỏi form.
- Nút **Xóa** trong danh sách mở hộp xác nhận. API `DELETE /api/v1/admin/devices/:id` dành cho admin/nhân viên; chặn xóa khi thiết bị có trạng thái đang cho thuê hoặc yêu cầu `pending`/`approved`/`borrowed`. Xóa bằng cách đánh dấu `deletedAt`, gỡ khỏi danh sách admin, danh mục công khai và yêu thích; không xóa lịch sử thuê hoặc ảnh Cloudinary. Không thể đặt thuê hoặc sửa thiết bị đã xóa.
- `/admin/requests`: danh sách yêu cầu thuê, lọc trạng thái và phân trang. Cột **Thao tác** có **Chi tiết**, **Duyệt đơn**/**Từ chối** khi chờ duyệt, **Giao hàng** khi đã duyệt, **Nhận lại thiết bị** khi đang thuê. Hộp xác nhận hiển thị tên, điện thoại, địa chỉ người nhận, thời gian và chi phí thuê.
- `/admin/users`: danh sách tài khoản, vai trò và tình trạng hoạt động, có phân trang. Chưa có thao tác đổi quyền hoặc khóa tài khoản.
- `/admin/staff`: [quản lý nhân viên](staff-management.md), thêm/sửa/xóa, khóa tài khoản và đặt lại mật khẩu nhân viên. Chỉ admin truy cập.

API `/api/v1/admin/*` yêu cầu JWT và kiểm tra vai trò hiện tại trong cơ sở dữ liệu. Tài khoản renter nhận 403; nhân viên chỉ được truy cập API thiết bị, tải ảnh và yêu cầu thuê; thiếu hoặc hết hạn JWT nhận 401. Giá tiền phải là số nguyên không âm; mã tài sản phải duy nhất; danh mục phải tồn tại. Không có dữ liệu mẫu hay số liệu giả trong giao diện.

## Duyệt và giao thiết bị

1. Mở `/admin/requests`, kiểm tra thông tin và nhấn **Duyệt đơn → Xác nhận duyệt**.
2. Sau khi đã bàn giao thiết bị cho khách, nhấn **Giao hàng → Xác nhận đã giao hàng**. Đơn chuyển từ `approved` sang `borrowed`; thiết bị chuyển sang **Đã cho thuê**. Đây là xác nhận bàn giao, chưa tích hợp dịch vụ vận chuyển hoặc mã vận đơn.
3. Khi khách trả thiết bị và đã kiểm tra, nhấn **Nhận lại thiết bị → Xác nhận đã nhận lại**. Đơn chuyển `completed`; thiết bị trở về **Còn thiết bị**.

API `PATCH /api/v1/admin/requests/:id/:action` hỗ trợ `approve`, `reject`, `handover`, `return`; `reject` nhận `{ "reason": "..." }` tùy chọn. Lưu người thực hiện, thời điểm duyệt, giao và nhận lại. Trạng thái khách hàng được đọc từ cùng bản ghi nên phản ánh kết quả khi tải lại trang.

Các thay đổi đơn và thiết bị được ghi trong MongoDB transaction; cần replica set hoặc Atlas. Khi duyệt/giao, kiểm tra lịch trùng với đơn đã duyệt/đang thuê và yêu cầu mượn; ghi `bookingVersion` để các quyết định đồng thời trên cùng tài sản không bỏ qua nhau. Thiết bị hỗ trợ tồn kho theo số lượng, duyệt nhiều máy nếu đủ sức chứa theo lịch. Xem [quản lý tồn kho](inventory.md). Không tự cập nhật trạng thái các đơn thật khi triển khai tính năng.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run build
# Cần frontend đang chạy ở cổng 5174:
npm.cmd run test:e2e -w frontend -- admin.spec.js
```

Kiểm tra giao diện dùng API giả lập để xác minh điều hướng, lưu form, bố cục mobile và chặn truy cập. Không ghi dữ liệu kiểm tra vào MongoDB thật.
