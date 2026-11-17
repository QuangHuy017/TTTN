import { test, expect } from "@playwright/test";
const categories = [
  "Máy tính",
  "Máy chiếu",
  "Máy in",
  "Máy chủ",
  "Màn hình",
].map((name, index) => ({ _id: String(index), name }));
const devices = Array.from({ length: 15 }, (_, index) => ({
  _id: String(index),
  name: `${categories[Math.floor(index / 3)].name} mẫu ${(index % 3) + 1}`,
  assetCode: `DEMO-${index}`,
  category: categories[Math.floor(index / 3)],
  status: index === 14 ? "maintenance" : "available",
  rentalPricePerDay: (index + 1) * 10000,
  depositAmount: 1000000,
  specifications: { RAM: index < 3 ? "16 GB" : "64 GB", CPU: "Intel Core i5" },
}));
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/devices/*", route => route.fulfill({ json: { data: devices.find(item => item._id === new URL(route.request().url()).pathname.split("/").pop()) } }));
  await page.route("**/api/v1/categories", (route) =>
    route.fulfill({ json: { data: categories } }),
  );
  await page.route("**/api/v1/devices?*", (route) => {
    const p = new URL(route.request().url()).searchParams;
    let data = devices.filter(
      (device) =>
        (!p.get("categoryName") ||
          device.category.name === p.get("categoryName")) &&
        (!p.get("q") || device.name.includes(p.get("q"))) &&
        (!p.get("status") || device.status === p.get("status")) &&
        (!p.has("minPrice") ||
          device.rentalPricePerDay >= Number(p.get("minPrice"))) &&
        (!p.has("maxPrice") ||
          device.rentalPricePerDay <= Number(p.get("maxPrice"))) &&
        (!p.has("spec.RAM") || device.specifications.RAM === p.get("spec.RAM")),
    );
    if (p.get("sort") === "price_desc") data = [...data].reverse();
    const pageNumber = Number(p.get("page") || 1),
      limit = Number(p.get("limit") || 9);
    return route.fulfill({
      json: {
        data: data.slice((pageNumber - 1) * limit, pageNumber * limit),
        pagination: {
          total: data.length,
          totalPages: Math.ceil(data.length / limit),
          hasNextPage: pageNumber * limit < data.length,
        },
      },
    });
  });
});
test("catalog combines filters, persists URL and handles browser back", async ({
  page,
}) => {
  await page.goto("/thiet-bi");
  await expect(page.locator(".device-card")).toHaveCount(9);
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(page.locator(".device-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Máy tính", exact: true }).click();
  await expect(page.locator(".device-card")).toHaveCount(3);
  await expect(page).not.toHaveURL(/page=2/);
  await page
    .locator(".catalog-sidebar")
    .getByRole("button", { name: "16 GB", exact: true })
    .click();
  await expect(page).toHaveURL(/spec.RAM=16\+GB/);
  await page.getByLabel("Giá tối đa", { exact: true }).fill("20000");
  await page.getByRole("button", { name: "Áp dụng giá" }).click();
  await expect(page.locator(".device-card")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".device-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Xóa bộ lọc Giá đến", exact: true })
    .click();
  await expect(page.locator(".device-card")).toHaveCount(3);
  await page.goBack();
  await expect(page.locator(".device-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Xóa tất cả", exact: true }).click();
  await expect(page.locator(".device-card")).toHaveCount(9);
});
test("price validation, sorting, availability, details and empty results work", async ({
  page,
}) => {
  await page.goto("/thiet-bi");
  await expect(page.locator(".device-card")).toHaveCount(9);
  await page.getByLabel("Giá tối thiểu", { exact: true }).fill("100000");
  await page.getByLabel("Giá tối đa", { exact: true }).fill("10000");
  await page.getByRole("button", { name: "Áp dụng giá" }).click();
  await expect(page.getByRole("alert")).toContainText("Nhập giá hợp lệ");
  await page.getByLabel("Sắp xếp thiết bị").selectOption("price_desc");
  await expect(page.locator(".device-card").first()).toContainText(
    "Màn hình mẫu 3",
  );
  await page
    .locator(".catalog-sidebar")
    .getByRole("radio", { name: "Có thể yêu cầu thuê" })
    .click();
  await expect(
    page
      .locator(".catalog-sidebar")
      .getByRole("radio", { name: "Có thể yêu cầu thuê" }),
  ).toBeChecked();
  await expect(page.locator(".device-card").first()).toContainText(
    "Màn hình mẫu 2",
  );
  await page
    .getByRole("link", { name: "Xem chi tiết", exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Xem tất cả', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.detail-specs')).toContainText('64 GB');
  await page.keyboard.press('Escape');
  await page.goBack();
  await page
    .getByRole("textbox", { name: "Tìm tên hoặc mã thiết bị" })
    .fill("not-found");
  await page.getByRole("button", { name: "Tìm thiết bị", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy thiết bị phù hợp" }),
  ).toBeVisible();
});
test("mobile filter dialog applies filters with no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/thiet-bi");
  await expect(page.locator(".device-card")).toHaveCount(9);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("radio", { name: "Máy tính", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("radio", { name: "Máy tính", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator(".device-card")).toHaveCount(3);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/categoryName=/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
