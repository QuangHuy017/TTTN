# Nhập ảnh thiết bị từ thư mục

## Tải trực tiếp trong admin

Vào `/admin/devices`, chọn **Thêm thiết bị** hoặc **Sửa**, rồi **Chọn ảnh từ máy tính**. Có thể chọn nhiều ảnh, tối đa 20 ảnh/thiết bị và 10 MB/ảnh. Giao diện hiển thị ảnh xem trước, tiến trình tải, nút thử lại khi lỗi và nút bỏ ảnh. Ảnh đầu tiên là ảnh đại diện. Nhấn **Lưu thiết bị** để ghi danh sách ảnh vào MongoDB.

`POST /api/v1/admin/device-images` nhận nội dung nhị phân ảnh trong request body, `Content-Type` tương ứng và `X-File-Name` đã encode URI. API yêu cầu JWT admin, kiểm tra định dạng và giới hạn dung lượng trước khi tải lên Cloudinary. Khóa Cloudinary chỉ dùng ở backend. Kết quả gồm metadata ảnh và `uploadToken` có hạn 24 giờ; API lưu thiết bị kiểm tra token hoặc đối chiếu ảnh cũ của đúng thiết bị. Không chấp nhận URL tùy ý từ client.

Form thiết bị đã bỏ ô tiền cọc và vị trí. Khi sửa thiết bị, các giá trị cũ của hai trường này được giữ nguyên; thiết bị mới dùng giá trị mặc định trong model. Bỏ ảnh trong form chỉ bỏ liên kết ảnh khi lưu thiết bị, không xóa tệp khỏi Cloudinary.

## Nhập hàng loạt

Mỗi thư mục con tương ứng một thiết bị; tên thư mục là tên thiết bị. Hỗ trợ PNG, JPG/JPEG, WebP, GIF và AVIF. Tệp HTML và liên kết tượng trưng không được nhập. Các ảnh được tải lên Cloudinary; MongoDB lưu URL HTTPS, public ID, tên tệp và kích thước trong `Device.images`.

Trong `backend/.env`, cấu hình `CLOUDINARY_URL` đầy đủ hoặc ba biến `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Không commit khóa bí mật.

Từ thư mục backend:

```powershell
# Xem kế hoạch, không ghi dữ liệu:
node src/scripts/import-device-images.js --source=C:/Users/Gauu/Downloads/chothue
# Tải ảnh và ghi MongoDB:
node src/scripts/import-device-images.js --source=C:/Users/Gauu/Downloads/chothue --apply
```

Thiết bị mới được phân loại **Máy tính**, lưu dạng nháp (`isPublished: false`), để trống mô tả, giá thuê và tiền cọc (`null`). Trong `/admin/devices`, nhấn **Sửa** để xem ảnh, điền mô tả/giá và chọn **Hiển thị trên website** khi hoàn tất. Bản nháp không xuất hiện trong danh mục, không cho xem chi tiết công khai hoặc đặt thuê. Các bản ghi cũ không có `isPublished` vẫn hiển thị.

Chạy lại dùng cùng mã tài sản theo tên thư mục và public ID theo nội dung ảnh; không tạo trùng thiết bị hoặc ghi đè ảnh Cloudinary. Với thiết bị đã nhập, chỉ cập nhật danh sách ảnh, giữ mô tả, giá, tên và trạng thái hiển thị đã sửa. Khi lỗi giữa chừng, một số ảnh có thể đã tồn tại trên Cloudinary; chạy lại sẽ tái sử dụng chúng. Báo cáo cuối cùng nằm trong `reports/device-image-import.json` ở gốc dự án.

Upload dùng [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference), xác thực phía backend; không đưa API secret lên frontend.
