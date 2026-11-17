import { fail } from './auth.js';
export function parseProfile(body, now = new Date()) {
  const allowed = ['fullName', 'phone', 'gender', 'birthDate'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) fail(400, 'Thông tin tài khoản không hợp lệ.');
  const result = {};
  if (body.fullName !== undefined) {
    if (typeof body.fullName !== 'string' || body.fullName.trim().length < 2 || body.fullName.trim().length > 100) fail(400, 'Họ tên phải từ 2 đến 100 ký tự.');
    result.fullName = body.fullName.trim();
  }
  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string' || (body.phone.trim() && !/^[+0-9 ()-]{9,20}$/.test(body.phone.trim()))) fail(400, 'Số điện thoại không hợp lệ.');
    result.phone = body.phone.trim();
  }
  if (body.gender !== undefined) {
    if (!['', 'male', 'female', 'other', 'undisclosed'].includes(body.gender)) fail(400, 'Giới tính không hợp lệ.');
    result.gender = body.gender;
  }
  if (body.birthDate !== undefined) {
    const value = body.birthDate;
    if (typeof value !== 'string') fail(400, 'Ngày sinh không hợp lệ.');
    if (value) {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value > today || value < '1900-01-01') fail(400, 'Ngày sinh phải là ngày hợp lệ, từ năm 1900 đến hôm nay.');
    }
    result.birthDate = value;
  }
  return result;
}
