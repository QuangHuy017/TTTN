import { test, expect } from '@playwright/test';
const items = ['pending', 'borrowed', 'completed'].map((status, index) => ({ _id: `507f1f77bcf86cd79943901${index}`, status, quantity: index + 1, createdAt: `2026-11-0${index + 1}T00:00:00Z`, startAt: '2026-11-10T00:00:00Z', endAt: '2026-11-15T00:00:00Z', contact: { name: 'Nguyễn Văn An', phone: '0988123456', email: 'an@example.com', address: '12 Nguyễn Huệ' }, device: { _id: '507f1f77bcf86cd799439011', name: ['Dell Latitude 7420', 'HP EliteBook', 'iPad Pro'][index], specifications: { RAM: '16 GB' } }, rentalAmount: 600000, depositAmount: 1000000 }));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('techrental-access-token', 'test-token'));
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: { fullName: 'Nguyễn Văn An' } } }));
  await page.route('**/api/v1/rental-requests/mine', route => route.fulfill({ json: { data: items } }));
});
test('rental management filters, searches, shows details and cancels pending requests', async ({ page }) => {
  await page.route('**/api/v1/rental-requests/*/cancel', route => route.fulfill({ json: { data: { _id: items[0]._id, status: 'cancelled' } } }));
  await page.goto('/yeu-cau-thue');
  await expect(page.locator('.rental-order')).toHaveCount(3);
  await expect(page.locator('.rental-stat.all>strong')).toHaveText('3');
  await page.getByRole('button', { name: /^Đang thuê/ }).click();
  await expect(page.locator('.rental-order')).toHaveCount(1);
  await expect(page.locator('.rental-order')).toContainText('HP EliteBook');
  await page.getByRole('button', { name: /^Tất cả/ }).click();
  await page.getByLabel('Tìm yêu cầu thuê').fill('Dell');
  await expect(page.locator('.rental-order')).toHaveCount(1);
  await page.getByRole('button', { name: 'Xem chi tiết đơn' }).click();
  await expect(page.getByRole('dialog')).toContainText('an@example.com');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Hủy yêu cầu', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận hủy' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.rental-order .rental-status')).toHaveText('Đã hủy');
  await expect(page.getByRole('button', { name: 'Hủy yêu cầu', exact: true })).toHaveCount(0);
});
test('mobile rental page fits viewport, filters dates and clears private data on logout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/yeu-cau-thue');
  await expect(page.locator('.rental-order')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Từ ngày', { exact: true }).fill('2026-12-01');
  await expect(page.locator('.rental-order')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mở menu tài khoản' }).click();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập để xem yêu cầu thuê' })).toBeVisible();
});
test('expired authentication never displays private rental data', async ({ page }) => {
  await page.route('**/api/v1/rental-requests/mine', route => route.fulfill({ status: 401, json: { message: 'Expired' } }));
  await page.goto('/yeu-cau-thue');
  await expect(page.getByRole('heading', { name: 'Đăng nhập để xem yêu cầu thuê' })).toBeVisible();
  await expect(page.locator('.rental-order')).toHaveCount(0);
});
