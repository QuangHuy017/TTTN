# API tìm kiếm thiết bị cho thuê

- `GET /api/v1/categories`: lấy `_id`, `name`, `description` của các loại thiết bị.
- `GET /api/v1/devices`: danh sách tài sản vật lý, có bộ lọc và phân trang.

| Tham số | Ý nghĩa |
| --- | --- |
| q | Tìm chuỗi con trong tên hoặc mã thiết bị |
| category | ObjectId loại thiết bị lấy từ API categories |
| categoryName | Tên loại chính xác, có dấu |
| status | Trạng thái: available, borrowed, maintenance, lost, retired; bỏ trống để lấy tất cả |
| configuration | Tìm chuỗi con trong bất kỳ giá trị cấu hình nào |
| spec.RAM, spec.CPU, spec.SSD | Lọc từng trường cấu hình; có thể kết hợp nhiều trường |
| minPrice, maxPrice | Giá thuê/ngày VND, số nguyên không âm, bao gồm hai đầu |
| page | Trang từ 1, mặc định 1, tối đa 100000 |
| limit | Số tài sản/trang, mặc định 12, tối đa 100 |
| sort | newest (mặc định), price_asc, price_desc, name_asc |

Tìm văn bản không phân biệt hoa/thường, có phân biệt dấu. Khóa cấu hình phân biệt hoa/thường theo dữ liệu, ví dụ RAM, CPU, resolution. Các bộ lọc kết hợp bằng AND. Lọc cấu hình là tìm văn bản, không phải so sánh dung lượng số.

Ví dụ:

```http
GET /api/v1/devices?q=DEMO&minPrice=100000&maxPrice=300000&page=1&limit=5&sort=price_asc
GET /api/v1/devices?spec.RAM=16%20GB&spec.CPU=i5
GET /api/v1/devices?configuration=Full%20HD
GET /api/v1/devices?categoryName=M%C3%A1y%20t%C3%ADnh
```

Response gồm `data` và `pagination`:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Mỗi thiết bị trả `_id`, `assetCode`, `name`, `category` được populate (name, description), `status`, `condition`, `specifications`, `rentalPricePerDay`, `depositAmount`, `currency`. Không trả vị trí kho hoặc thông tin người dùng/phiếu thuê. Đây là API đọc công khai; các API ghi chưa triển khai.

Tham số sai, rỗng, lặp khóa, không được hỗ trợ hoặc khoảng giá ngược trả HTTP 400. Ký tự regex được coi là văn bản, không cho truyền toán tử MongoDB. Không có kết quả hoặc vượt số trang trả 200 và data rỗng. Thứ tự có thêm _id để ổn định khi giá hoặc tên bằng nhau.

Danh sách gồm mọi trạng thái thiết bị, chưa xác nhận khả dụng theo khoảng thời gian thuê. `newest` dùng createdAt; bản ghi mẫu thiếu createdAt được phân định bằng _id. Khi có ghi đồng thời, total và data có thể thay đổi giữa các truy vấn. Index hỗ trợ loại và giá; tìm chuỗi con/cấu hình tổng quát có thể scan dữ liệu, cần đánh giá lại khi dữ liệu lớn.
