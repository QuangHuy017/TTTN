import { test, expect } from "@playwright/test";

const categories = ["Máy tính", "Máy chiếu", "Máy in", "Máy chủ", "Màn hình"];
const devices = Array.from({ length: 15 }, (_, index) => ({
  _id: String(index),
  name: `${categories[Math.floor(index / 3)]} mẫu ${(index % 3) + 1}`,
  assetCode: `DEMO-${index}`,
  category: { name: categories[Math.floor(index / 3)] },
  status: "available",
  rentalPricePerDay: (index + 1) * 10000,
  depositAmount: 1000000,
  specifications: { RAM: "16 GB" },
  condition: "Hoạt động tốt",
}));
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/devices/*", route => route.fulfill({ json: { data: devices.find(item => item._id === new URL(route.request().url()).pathname.split("/").pop()) } }));
  await page.route("**/api/v1/devices?*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    let filtered = devices.filter(
      (device) =>
        (!params.get("categoryName") ||
          device.category.name === params.get("categoryName")) &&
        (!params.get("q") || device.name.includes(params.get("q"))),
    );
    if (params.get("sort") === "price_desc") filtered = [...filtered].reverse();
    const number = Number(params.get("page") || 1);
    const limit = Number(params.get("limit") || 8);
    await route.fulfill({
      json: {
        data: filtered.slice((number - 1) * limit, number * limit),
        pagination: {
          total: filtered.length,
          page: number,
          totalPages: Math.ceil(filtered.length / limit),
          hasNextPage: number * limit < filtered.length,
        },
      },
    });
  });
});

test("catalog filters, paginates, searches and opens accessible details", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Thiết bị bạn cần",
  );
  await expect(page.locator(".device-card")).toHaveCount(8);
  await page.getByRole("button", { name: "Tiếp", exact: true }).click();
  await expect(page.locator(".device-card")).toHaveCount(7);
  await page
    .locator(".category-tabs")
    .getByRole("button", { name: "Máy tính", exact: true })
    .click();
  await expect(page.locator(".device-card")).toHaveCount(3);
  await page
    .getByRole("link", { name: "Xem chi tiết", exact: true })
    .first()
    .click();
  await expect(page.locator(".detail-title")).toBeVisible();
  await expect(page.locator(".detail-specs")).toContainText("16 GB");
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".category-tabs")
    .getByRole("button", { name: "Tất cả", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Tìm tên hoặc mã thiết bị" })
    .fill("not-found");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByText("Chưa tìm thấy thiết bị phù hợp")).toBeVisible();
  await page
    .getByRole("button", { name: "Xem tất cả thiết bị", exact: true })
    .click();
  await expect(page.locator(".device-card")).toHaveCount(8);
  await page.getByLabel("Sắp xếp thiết bị").selectOption("price_desc");
  await expect(page.locator(".device-card").first()).toContainText(
    "Màn hình mẫu 3",
  );
});

test("mobile menu, modal and page fit without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".device-card")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Điều hướng chính" })
    .getByText("Quy trình thuê")
    .click();
  await expect(page.getByRole("button", { name: "Mở menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByRole("link", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chào mừng trở lại!" })).toBeVisible();
  await expect(page).toHaveURL(/dang-nhap/);
});

test("failed API can be retried without replacing data with fake products", async ({
  page,
}) => {
  await page.unroute("**/api/v1/devices?*");
  await page.route("**/api/v1/devices?*", (route) =>
    route.fulfill({ status: 503, json: { message: "Unavailable" } }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".device-card")).toHaveCount(0);
  await page.route("**/api/v1/devices?*", (route) =>
    route.fulfill({
      json: { data: [], pagination: { total: 0, totalPages: 0 } },
    }),
  );
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByText("Chưa tìm thấy thiết bị phù hợp")).toBeVisible();
});
