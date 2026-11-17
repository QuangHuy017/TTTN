# Kiến trúc và kế hoạch

React → REST JSON /api/v1 → Express routes → controllers → services → Mongoose → MongoDB.
Controller xử lý HTTP, service xử lý nghiệp vụ, model định nghĩa dữ liệu.

Vai trò hiện tại: renter (khách thuê), staff (nhân viên), admin (quản trị).
Đã có JWT, lưu mật khẩu nguyên văn cho tài khoản mới theo yêu cầu chủ dự án (hỗ trợ scrypt cho tài khoản cũ), middleware xác thực/phân quyền và API tạo nhân viên bởi admin. Xem [Auth API](auth-api.md). Các quyền nghiệp vụ mượn/trả sẽ được gắn khi triển khai từng module.

Mỗi Device là một tài sản vật lý có mã riêng. BorrowRequest tham chiếu người mượn và danh sách thiết bị. Các model bổ sung sau: Handover, ReturnRecord, MaintenanceTicket, Notification, Feedback, AuditLog.

Luồng dự kiến: pending → approved/rejected/cancelled; approved → borrowed/cancelled; borrowed → completed. Chỉ cho sửa khi pending. Đề xuất hủy trước bàn giao; cần thống nhất quyền chi tiết và ngưỡng duyệt dài hạn/giá trị cao trước khi triển khai.

Khoảng mượn [startAt, endAt), trùng khi startA < endB và endA > startB. Khi duyệt phải kiểm tra approved/borrowed, bảo trì và thiết bị chưa trả dù quá hạn. Index không ngăn trùng lịch. Cần transaction kết hợp ghi/khóa trên tài sản để tránh hai yêu cầu duyệt đồng thời; MongoDB transaction cần replica set hoặc Atlas.

Trả thiết bị phải lưu tình trạng từng chiếc: hỏng chuyển maintenance, mất chuyển lost. Quá hạn được tính riêng từ hạn trả. Lưu giờ UTC, hiển thị Asia/Ho_Chi_Minh.

Thứ tự phát triển:

1. Auth: mật khẩu nguyên văn cho tài khoản mới, JWT, kiểm tra input, phân quyền và tài khoản khóa.
2. CRUD danh mục/thiết bị, tìm kiếm, phân trang.
3. Tạo/sửa/hủy phiếu, duyệt và chống trùng lịch đồng thời.
4. Bàn giao/trả, tình trạng và lịch sử.
5. Bảo trì, thông báo, nhắc hạn, phản hồi.
6. Báo cáo, nhật ký và kiểm thử nghiệp vụ.

Đây là kế hoạch, chưa phải chức năng hoàn chỉnh. Tài liệu đính kèm được dùng làm nguồn yêu cầu; phạm vi thực hiện hiện tại là cấu trúc dự án theo yêu cầu trong chat.
