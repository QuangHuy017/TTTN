import { test, expect } from '@playwright/test';
const customer = { _id: '507f1f77bcf86cd799439011', fullName: 'Khách hàng An', email: 'an@example.com', role: 'renter' };
const employee = { _id: '507f1f77bcf86cd799439012', fullName: 'Nhân viên Bình', email: 'staff@example.com', role: 'staff' };
const roomId = '507f1f77bcf86cd799439013';
test('customer sends, staff replies, messages persist and logout clears customer chat', async ({ page, browser }) => {
  const messages = []; let created = false;
  const room = { _id: roomId, customer, sequence: 0, staffUnread: 0, customerUnread: 0, lastMessageAt: new Date().toISOString(), lastMessage: '' };
  async function mock(context, user) {
    await context.addInitScript(() => sessionStorage.setItem('techrental-access-token', 'test-token'));
    await context.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname, method = route.request().method();
      let body = {};
      if (method !== 'GET') { try { body = route.request().postDataJSON() || {}; } catch { /* Requests without JSON carry no fields. */ } }
      let result;
      if (path.endsWith('/auth/me')) result = { user };
      else if (path.endsWith('/chat/summary')) result = { unreadCount: user.role === 'renter' ? room.customerUnread : room.staffUnread, staff: user.role !== 'renter' };
      else if (path.endsWith('/chat/mine')) { created = true; result = { data: room }; }
      else if (path.endsWith('/chat/conversations')) result = { data: created ? [room] : [], pagination: { total: created ? 1 : 0, totalPages: created ? 1 : 0 } };
      else if (path.endsWith(`/conversations/${roomId}/messages`)) {
        if (method === 'POST') {
          let message = messages.find(item => item.clientId === body.clientId);
          if (!message) {
            message = { _id: `message-${messages.length + 1}`, conversation: roomId, sender: user._id, senderRole: user.role, senderName: user.fullName, content: body.content, clientId: body.clientId, sequence: ++room.sequence, createdAt: new Date().toISOString() };
            messages.push(message); room.lastMessage = message.content;
            if (user.role === 'renter') room.staffUnread++; else room.customerUnread++;
          }
          result = { data: message };
        } else result = { data: messages.filter(item => item.sequence > Number(url.searchParams.get('after') || 0)), conversation: room, hasMore: false, nextBefore: messages[0]?.sequence || null };
      } else if (path.endsWith(`/conversations/${roomId}/read`)) { if (user.role === 'renter') room.customerUnread = 0; else room.staffUnread = 0; result = { data: { unread: 0 } }; }
      else if (path.endsWith('/notifications')) result = { data: [], unreadCount: 0, pagination: { total: 0, totalPages: 0 } };
      else result = { data: [], pagination: { total: 0, totalPages: 0 } };
      return route.fulfill({ json: result });
    });
  }
  const staffContext = await browser.newContext();
  try {
    await mock(page.context(), customer); await mock(staffContext, employee);
    await page.goto('/');
    await page.getByRole('button', { name: 'Nhắn tin hỗ trợ', exact: true }).click();
    const chat = page.getByRole('dialog', { name: 'Chat với nhân viên' });
    await chat.getByRole('textbox', { name: 'Nội dung tin nhắn' }).fill('Tôi muốn thuê laptop Dell');
    await chat.getByRole('button', { name: 'Gửi tin nhắn' }).click();
    await expect(chat.getByText('Tôi muốn thuê laptop Dell', { exact: true })).toBeVisible();
    const staffPage = await staffContext.newPage();
    await staffPage.goto('http://localhost:5174/nhan-vien/tin-nhan');
    await expect(staffPage.getByText('Tôi muốn thuê laptop Dell', { exact: true }).last()).toBeVisible();
    await staffPage.getByRole('textbox', { name: 'Nội dung tin nhắn' }).fill('Chào bạn, bạn cần thuê trong bao lâu?');
    await staffPage.getByRole('button', { name: 'Gửi tin nhắn' }).click();
    await expect(chat.getByText('Chào bạn, bạn cần thuê trong bao lâu?', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: 'Nhắn tin hỗ trợ', exact: true }).click();
    await expect(chat.getByText('Chào bạn, bạn cần thuê trong bao lâu?', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Đóng chat hỗ trợ' }).click();
    await page.getByRole('button', { name: 'Mở menu tài khoản' }).click();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.getByRole('button', { name: 'Nhắn tin hỗ trợ', exact: true }).click();
    await expect(chat.getByRole('link', { name: 'Đăng nhập để nhắn tin' })).toBeVisible();
    await expect(chat.getByText('Tôi muốn thuê laptop Dell', { exact: true })).toHaveCount(0);
    expect(messages.length).toBe(2);
  } finally { await staffContext.close(); }
});
test('anonymous chat invites login and renters cannot use staff inbox', async ({ page }) => {
  await page.goto('/dang-nhap');
  await page.getByRole('button', { name: 'Nhắn tin hỗ trợ', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Đăng nhập để nhắn tin' })).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('techrental-access-token', 'test-token'));
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: customer } }));
  await page.goto('/nhan-vien/tin-nhan');
  await expect(page.getByRole('heading', { name: 'Hộp thư dành cho nhân viên' })).toBeVisible();
});
