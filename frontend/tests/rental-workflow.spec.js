import { test, expect } from '@playwright/test';
test('admin approves a request, confirms delivery and receives the device back', async ({ page }) => {
  const id = '507f1f77bcf86cd799439011';
  let status = 'pending';
  const record = () => ({ _id: id, status, quantity: 1, device: { name: 'Laptop kiểm tra', assetCode: 'LT-01' }, contact: { name: 'Nguyễn Văn An', phone: '0988123456', email: 'an@example.com', address: '12 Nguyễn Huệ, TP.HCM' }, startAt: '2026-11-16', endAt: '2026-11-23', rentalAmount: 700000 });
  await page.addInitScript(() => sessionStorage.setItem('techrental-access-token', 'test-token'));
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: { fullName: 'Admin', role: 'admin' } } }));
  await page.route('**/api/v1/admin/overview', route => route.fulfill({ json: { data: { pending: status === 'pending' ? 1 : 0 } } }));
  await page.route('**/api/v1/admin/requests?*', route => route.fulfill({ json: { data: [record()], pagination: { total: 1, pages: 1 } } }));
  await page.route(`**/api/v1/admin/requests/${id}/*`, route => {
    const action = route.request().url().split('/').pop();
    status = { approve: 'approved', handover: 'borrowed', return: 'completed' }[action];
    return route.fulfill({ json: { data: { _id: id, status } } });
  });
  await page.goto('/admin/requests');
  await expect(page.getByRole('button', { name: 'Giao hàng', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Duyệt đơn', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('12 Nguyễn Huệ, TP.HCM')).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận duyệt' }).click();
  await page.getByRole('button', { name: 'Giao hàng', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('0988123456')).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận đã giao hàng' }).click();
  await expect(page.getByRole('cell', { name: 'Đang thuê', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nhận lại thiết bị', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận đã nhận lại' }).click();
  await expect(page.getByRole('cell', { name: 'Hoàn thành', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Giao hàng', exact: true })).toHaveCount(0);
});
