import { test, expect } from '@playwright/test';
test('admin creates, edits, searches and deletes staff with confirmation', async ({ page }) => {
  let staff = null; let submitted;
  const id = '507f1f77bcf86cd799439012';
  await page.addInitScript(() => sessionStorage.setItem('techrental-access-token', 'test-token'));
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: { fullName: 'Admin', role: 'admin' } } }));
  await page.route('**/api/v1/admin/staff?*', route => {
    const q = (new URL(route.request().url()).searchParams.get('q') || '').toLowerCase();
    const data = staff && `${staff.fullName} ${staff.email}`.toLowerCase().includes(q) ? [staff] : [];
    return route.fulfill({ json: { data, pagination: { total: data.length, totalPages: data.length ? 1 : 0 } } });
  });
  await page.route('**/api/v1/admin/staff', route => { submitted = route.request().postDataJSON(); staff = { ...submitted, _id: id, role: 'staff' }; return route.fulfill({ status: 201, json: { data: staff } }); });
  await page.route(`**/api/v1/admin/staff/${id}`, route => {
    if (route.request().method() === 'DELETE') { staff = null; return route.fulfill({ json: { data: { _id: id } } }); }
    submitted = route.request().postDataJSON(); staff = { ...staff, ...submitted }; return route.fulfill({ json: { data: staff } });
  });
  await page.goto('/admin/staff');
  await expect(page.getByRole('heading', { name: 'Quản lý nhân viên', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm nhân viên', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Thêm nhân viên' });
  await dialog.getByLabel('Họ và tên', { exact: true }).fill('Nhân viên An');
  await dialog.getByLabel('Email đăng nhập', { exact: true }).fill('staff@example.com');
  await dialog.getByLabel('Số điện thoại', { exact: true }).fill('0988123456');
  await expect(dialog.locator('input[name="department"]')).toHaveCount(0);
  await dialog.getByLabel('Mật khẩu', { exact: true }).fill('ExamplePassword123');
  await dialog.getByRole('button', { name: 'Lưu nhân viên' }).click();
  await expect(page.getByRole('cell', { name: 'staff@example.com' })).toBeVisible();
  expect(submitted.isActive).toBe(true);
  expect(submitted.department).toBeUndefined();
  await page.getByRole('button', { name: 'Sửa nhân viên Nhân viên An' }).click();
  dialog = page.getByRole('dialog', { name: 'Chỉnh sửa nhân viên' });
  await expect(dialog.getByLabel('Mật khẩu mới', { exact: true })).toHaveValue('');
  await dialog.getByLabel('Họ và tên', { exact: true }).fill('Nhân viên Bình');
  await dialog.getByRole('button', { name: 'Lưu nhân viên' }).click();
  await expect(page.getByRole('cell', { name: 'Nhân viên Bình', exact: true })).toBeVisible();
  expect(submitted.password).toBeUndefined();
  await page.getByRole('textbox', { name: 'Tìm nhân viên' }).fill('not-found');
  await expect(page.getByRole('heading', { name: 'Không tìm thấy nhân viên phù hợp' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm nhân viên' }).fill('');
  await page.getByRole('button', { name: 'Xóa nhân viên Nhân viên Bình' }).click();
  await page.getByRole('dialog', { name: 'Xóa nhân viên?' }).getByRole('button', { name: 'Hủy', exact: true }).click();
  expect(staff).not.toBe(null);
  await page.getByRole('button', { name: 'Xóa nhân viên Nhân viên Bình' }).click();
  await page.getByRole('button', { name: 'Xác nhận xóa nhân viên' }).click();
  await expect(page.getByRole('heading', { name: 'Chưa có nhân viên', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
