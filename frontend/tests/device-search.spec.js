import { test, expect } from '@playwright/test';
const devices = [
  { _id: '507f1f77bcf86cd799439011', name: 'Laptop Dell Latitude', assetCode: 'LT-DELL-01', status: 'available', category: { name: 'Máy tính' }, rentalPricePerDay: 100000, depositAmount: 0 },
  { _id: '507f1f77bcf86cd799439012', name: 'Máy chiếu Epson', assetCode: 'PJ-EPSON-02', status: 'available', category: { name: 'Máy chiếu' }, rentalPricePerDay: 200000, depositAmount: 0 },
];
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/categories', route => route.fulfill({ json: { data: [{ name: 'Máy tính' }, { name: 'Máy chiếu' }] } }));
  await page.route('**/api/v1/devices?*', route => {
    const q = (new URL(route.request().url()).searchParams.get('q') || '').toLowerCase();
    const data = devices.filter(device => `${device.name} ${device.assetCode}`.toLowerCase().includes(q));
    return route.fulfill({ json: { data, pagination: { total: data.length, totalPages: data.length ? 1 : 0 } } });
  });
});
test('homepage search finds device name, retains query on reload and clears results', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('search', { name: 'Tìm kiếm thiết bị trên website' });
  await expect(search).toBeInViewport();
  await search.getByRole('textbox').fill('Dell');
  await search.getByRole('textbox').press('Enter');
  await expect(page).toHaveURL(/thiet-bi\?q=Dell$/);
  await expect(page.locator('.device-card')).toHaveCount(1);
  await expect(page.locator('.device-card')).toContainText('Laptop Dell Latitude');
  await page.reload();
  await expect(search.getByRole('textbox')).toHaveValue('Dell');
  await search.getByRole('button', { name: 'Xóa từ khóa tìm kiếm' }).click();
  await search.getByRole('button', { name: 'Tìm kiếm toàn bộ thiết bị' }).click();
  await expect(page.locator('.device-card')).toHaveCount(2);
});
test('global search finds asset codes and fits mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const search = page.getByRole('search', { name: 'Tìm kiếm thiết bị trên website' });
  await search.getByRole('textbox').fill('PJ-EPSON-02');
  await search.getByRole('button', { name: 'Tìm kiếm toàn bộ thiết bị' }).click();
  await expect(page.locator('.device-card')).toHaveCount(1);
  await expect(page.locator('.device-card')).toContainText('Máy chiếu Epson');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
