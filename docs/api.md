# REST API

Base URL: http://localhost:5000/api/v1.

Đã triển khai `GET /devices` và `GET /categories`: xem [bộ lọc và phân trang](device-api.md). Các thao tác ghi dữ liệu bên dưới vẫn chưa triển khai.

Đã triển khai GET /health: trả 200 khi MongoDB connected, 503 khi mất kết nối. Server chỉ lắng nghe sau khi kết nối database thành công. API không tồn tại trả JSON 404.

Dự kiến (chưa triển khai): /auth, /users, /categories, /devices, /requests, /maintenance, /notifications, /reports. Các thao tác approve, reject, cancel, handover và return thuộc phiếu mượn.

Chỉ mount API nghiệp vụ khi có xác thực, quyền vai trò và quyền sở hữu. Xem docs/api.http để kiểm tra health bằng REST Client.
