# Chat hỗ trợ khách hàng

## Khách hàng

Nhấn **Chat với nhân viên** ở góc dưới website và đăng nhập bằng tài khoản khách hàng. Sau đó nhập tin, nhấn Enter hoặc nút gửi; Shift + Enter để xuống dòng. Lịch sử lưu trong MongoDB, xem lại được sau khi đóng chat, tải trang hoặc đăng nhập lại. Khi có phản hồi, nút chat hiển thị số tin chưa đọc.

## Nhân viên và admin

Mở `/nhan-vien/tin-nhan` (hoặc `/admin/tin-nhan`) bằng tài khoản `staff` hoặc `admin`. Liên kết **Tin nhắn khách hàng** có trong menu tài khoản; sidebar admin cũng có liên kết này. Tài khoản nhân viên vào không gian làm việc sau khi đăng nhập; chọn Tin nhắn khách hàng để mở hộp thư.

Hộp thư có tìm khách theo tên/email, bộ lọc chưa đọc, phân trang, lịch sử và ô trả lời. Nhân viên dùng chính tài khoản của mình để gửi; tin nhắn hiển thị tên người trả lời. Mọi nhân viên/admin có thể hỗ trợ cùng một khách. Trạng thái đã đọc của đội nhân viên được dùng chung.

## Lưu trữ và phân quyền

- Collection `conversations`: một cuộc trò chuyện cho mỗi tài khoản khách; bản xem trước và bộ đếm chưa đọc.
- Collection `chatmessages`: nội dung, người gửi, tên/vai trò người gửi tại thời điểm gửi và thứ tự tin trong cuộc trò chuyện.
- Khách chỉ được đọc/gửi trong cuộc trò chuyện của chính mình. Nhân viên/admin được mở hộp thư khách hàng. Các kiểm tra diễn ra tại backend cho từng request.
- Gửi tin và cập nhật bộ đếm dùng MongoDB transaction. `clientId` chống gửi trùng khi thử lại. Lịch sử có tải thêm tin cũ, không chỉ giới hạn ở 50 tin đầu tiên.
- Tin nhắn tối đa 2000 ký tự; API giới hạn 30 lượt gửi/phút/IP. Nội dung hiển thị dạng văn bản, không thực thi HTML.
- Chat đang mở tự lấy tin mới mỗi 4 giây; hộp thư mỗi 5 giây, bộ đếm ở nút chat mỗi 10 giây. Dừng kiểm tra định kỳ khi tab ẩn; lấy lại tin khi quay lại. Đây là chat văn bản, chưa hỗ trợ gửi tệp hoặc ảnh.

## API

Tất cả yêu cầu Bearer JWT:

- `GET /api/v1/chat/summary`: số chưa đọc của khách hoặc số cuộc trò chuyện chưa đọc của đội hỗ trợ.
- `POST /api/v1/chat/mine`: lấy/tạo cuộc trò chuyện của khách đã đăng nhập.
- `GET /api/v1/chat/conversations?page=1&q=...&unread=true`: hộp thư nhân viên/admin.
- `GET /api/v1/chat/conversations/:id/messages`: 50 tin gần nhất; `before=<sequence>` để tải lịch sử, `after=<sequence>` để lấy tin mới.
- `POST /api/v1/chat/conversations/:id/messages`: `{ "content": "...", "clientId": "UUID từ trình duyệt" }`.
- `PATCH /api/v1/chat/conversations/:id/read`: `{ "throughSequence": 12 }`; chỉ đánh dấu tới mốc đã tải, không nuốt tin vừa đến sau mốc đó.

Khóa API, mật khẩu và nội dung `.env` không được gửi trong cuộc trò chuyện. Các kiểm tra giao diện dùng dữ liệu giả lập và tài khoản riêng, không nhắn vào tài khoản khách thật.
