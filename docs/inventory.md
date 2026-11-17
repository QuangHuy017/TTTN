# Tồn kho thiết bị

Trong `/admin/devices`, danh sách có ảnh đại diện và cột **Tồn kho**: số máy đang có trong kho và số máy đang cho thuê. Chọn **Thêm/Sửa**, nhập **Số lượng trong kho**, ví dụ 45. Chỉ nhận số nguyên từ 0 đến 1000000.

`stockQuantity` là số lượng vật lý hiện có trong kho; `rentedQuantity` là số lượng đã bàn giao cho khách và chưa nhận lại. Tổng số máy của loại thiết bị là tổng hai trường này. Admin chỉ chỉnh số trong kho, không ghi đè số đang thuê.

- Duyệt đơn: kiểm tra tổng số máy đủ cho mức thuê đồng thời lớn nhất trong lịch. Đơn đã duyệt giữ khả năng phục vụ theo ngày; số vật lý trong kho chưa thay đổi.
- Giao hàng: trừ `quantity` khỏi kho, cộng vào đang thuê. Ví dụ 45 → 40 khi giao 5. Nếu vẫn còn máy, trạng thái vẫn **Còn thiết bị**; giao hết kho thì **Đã cho thuê**.
- Nhận lại: cộng số lượng về kho và giảm đang thuê. Đơn chỉ hoàn tất một lần; nhấn lặp không cộng kho lần nữa. Bảo trì/ngừng sử dụng do admin đặt được giữ lại khi nhận trả.
- Số lượng 0 và không có máy đang thuê hiển thị **Hết hàng**; không nhận yêu cầu vượt số máy hiện có.
- Không cho giảm kho nếu tổng kho + đang thuê thấp hơn số lượng đã cam kết trong lịch.

Giao/nhận, duyệt đồng thời và chỉnh kho dùng transaction cùng khóa `bookingVersion` trên thiết bị, giúp tránh bán vượt số lượng. Lịch mượn cũ vẫn được tính mỗi mã thiết bị là một máy. Các khoảng thuê tiếp giáp không bị cộng trùng sức chứa.

Thiết bị cũ chưa có hai trường tồn kho được hiển thị tương thích với mô hình trước đây: **Còn thiết bị** mặc định 1 trong kho, **Đã cho thuê** mặc định 0 trong kho/1 đang thuê. Không tự đặt 45 cho dữ liệu thật; admin cần kiểm kê và nhập đúng số máy. Khi lưu hoặc giao/nhận, các trường được ghi vào MongoDB.

API công khai, chi tiết, yêu thích và danh sách admin trả hai trường tồn kho. Form thuê hiển thị số trong kho và giới hạn số lượng chọn (tối đa 100 máy/yêu cầu theo giới hạn hiện có).
