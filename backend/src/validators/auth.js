import { ROLES } from '../constants/domain.js';
export function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export function parseCredentials(body, registration = false, admin = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid JSON body');
  const allowed = registration ? ['email', 'password', 'fullName', ...(admin ? ['role'] : [])] : ['email', 'password'];
  if (Object.keys(body).some(key => !allowed.includes(key))) fail(400, 'Unsupported field');
  if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) fail(400, 'Invalid email');
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) fail(400, 'Password must contain 8 to 128 characters');
  const result = { email: body.email.trim().toLowerCase(), password: body.password };
  if (registration) {
    if (typeof body.fullName !== 'string' || body.fullName.trim().length < 2 || body.fullName.trim().length > 100) fail(400, 'Full name must contain 2 to 100 characters');
    result.fullName = body.fullName.trim();
    result.role = 'renter';
    if (admin) {
      if (!ROLES.includes(body.role)) fail(400, 'Invalid role');
      result.role = body.role;
    }
  }
  return result;
}
