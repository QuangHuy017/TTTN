import { test, expect } from "@playwright/test";
const device = { _id: "507f1f77bcf86cd799439011", name: "Laptop Dell Latitude 7420", assetCode: "LT-001", category: { name: "Máy tính" }, status: "available", specifications: { CPU: "Intel Core i7", RAM: "16 GB", SSD: "512 GB" }, rentalPricePerDay: 120000, depositAmount: 1000000, condition: "Hoạt động tốt" };
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/devices?*", route => route.fulfill({ json: { data: [] } }));
  await page.route(`**/api/v1/devices/${device._id}`, route => route.fulfill({ json: { data: device } }));
});
test("detail computes quantity totals and sends rental request", async ({ page }) => {
  let sent;
  await page.route("**/api/v1/rental-requests", route => {
    sent = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { data: { _id: "request-001", status: "pending" } } });
  });
  await page.goto(`/thiet-bi/${device._id}`);
  await expect(page.getByRole("heading", { name: device.name })).toBeVisible();
  await expect(page.locator(".detail-specs")).toContainText("16 GB");
  await page.getByRole("tab", { name: "Điều kiện thuê" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("biên bản bàn giao");
  await page.getByRole("button", { name: /7 ngày/ }).click();
  await expect(page.locator(".rental-total")).toContainText("1.840.000đ");
  await page.getByRole("button", { name: "Tăng số lượng" }).click();
  await page.getByRole("button", { name: "Tăng số lượng" }).click();
  await expect(page.getByLabel("Số lượng muốn thuê")).toHaveValue("3");
  await expect(page.locator(".rental-total")).toContainText("5.520.000đ");
  await page.getByLabel("Họ và tên người thuê").fill("Nguyễn Văn An");
  await page.getByLabel("Số điện thoại", { exact: false }).fill("0988123456");
  await page.getByLabel("Email liên hệ").fill("an@example.com");
  await page.getByLabel("Địa chỉ nhận thiết bị").fill("12 Nguyễn Huệ, TP.HCM");
  await page.getByRole("button", { name: "GỬI YÊU CẦU THUÊ THIẾT BỊ" }).click();
  await expect(page.getByRole("status")).toContainText("request-001");
  expect(sent.quantity).toBe(3);
  expect(sent.name).toBe("Nguyễn Văn An");
});
test("mobile detail fits viewport and rejects invalid rental dates", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/thiet-bi/${device._id}`);
  await expect(page.locator(".detail-title")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const start = await page.getByLabel("Ngày bắt đầu").inputValue();
  await page.getByLabel("Ngày hoàn trả").fill(start);
  await expect(page.getByRole("alert")).toContainText("ngày trả sau ngày bắt đầu");
  await expect(page.getByRole("button", { name: "GỬI YÊU CẦU THUÊ THIẾT BỊ" })).toBeDisabled();
});
test("unavailable assets cannot be rented", async ({ page }) => {
  await page.route(`**/api/v1/devices/${device._id}`, route => route.fulfill({ json: { data: { ...device, status: "maintenance" } } }));
  await page.goto(`/thiet-bi/${device._id}`);
  await expect(page.getByRole("button", { name: "THIẾT BỊ CHƯA SẴN SÀNG" })).toBeDisabled();
});
test("missing product has a useful error state", async ({ page }) => {
  await page.route("**/api/v1/devices/missing", route => route.fulfill({ status: 404, json: { message: "Not found" } }));
  await page.goto("/thiet-bi/missing");
  await expect(page.getByRole("alert")).toContainText("Không tìm thấy thiết bị");
  await expect(page.getByRole("link", { name: "Về danh mục" })).toHaveAttribute("href", "/thiet-bi");
});
test('technical specifications match labeled rows, preserve newlines and expand accessibly on mobile', async ({ page }) => {
  await page.route(`**/api/v1/devices/${device._id}`, route => route.fulfill({ json: { data: { ...device, specifications: { ...device.specifications, GPU: 'GPU 10 lõi\nNeural Engine 16 lõi', ports: 'MagSafe 3\nThunderbolt 4', weight: '1.5 kg' } } } }));
  await page.goto(`/thiet-bi/${device._id}`);
  await expect(page.getByRole('heading', { name: 'Thông số kỹ thuật', exact: true })).toBeVisible();
  const table = page.getByRole('table', { name: 'Thông số kỹ thuật thiết bị' });
  await expect(table.getByRole('row').filter({ hasText: 'Dung lượng RAM' })).toContainText('16 GB');
  await expect(table.getByRole('row').filter({ hasText: 'Loại card đồ họa' })).toContainText('Neural Engine 16 lõi');
  await expect(table.getByRole('row').filter({ hasText: 'Pin' })).toContainText('Đang cập nhật');
  await expect(table.getByRole('cell', { name: 'GPU 10 lõi\nNeural Engine 16 lõi' })).toHaveCSS('white-space', 'pre-line');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Xem tất cả', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Thông số kỹ thuật đầy đủ' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('row').filter({ hasText: 'weight' })).toContainText('1.5 kg');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Xem tất cả', exact: true })).toBeFocused();
});
for (const [category, specifications, label, value] of [
  ['Máy chiếu', { resolution: 'Full HD', imageTechnology: 'HDR\nMEMC', manufacturer: 'Wanbo' }, 'Công nghệ hình ảnh', 'HDR MEMC'],
  ['Màn hình', { screenSize: '27 inches', panel: 'IPS', refreshRate: '120 Hz', resolution: '2560 x 1440 pixels' }, 'Tần số quét', '120 Hz'],
]) {
  test(`detail uses the ${category} specification template`, async ({ page }) => {
    await page.route(`**/api/v1/devices/${device._id}`, route => route.fulfill({ json: { data: { ...device, category: { name: category }, specifications } } }));
    await page.goto(`/thiet-bi/${device._id}`);
    const table = page.getByRole('table', { name: 'Thông số kỹ thuật thiết bị' });
    await expect(table.getByRole('row').filter({ hasText: label })).toContainText(value);
    await expect(table.getByRole('rowheader', { name: 'Loại CPU', exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
