import mongoose from 'mongoose';
import User from '../models/User.js';
import { verifyAccessToken } from '../utils/token.js';
import { fail } from '../validators/auth.js';
export async function authenticate(req, res, next) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '');
  if (!match) fail(401, 'Bearer token is required');
  let payload;
  try { payload = verifyAccessToken(match[1]); }
  catch (error) {
    if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) throw error;
    fail(401, 'Invalid or expired token');
  }
  if (!mongoose.isObjectIdOrHexString(payload.sub)) fail(401, 'Invalid token subject');
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.deletedAt) fail(401, 'Account is unavailable');
  if ((payload.version ?? 0) !== (user.tokenVersion || 0)) fail(401, 'Password has changed. Please login again.');
  req.user = user;
  next();
}
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) fail(401, 'Authentication required');
  if (!roles.includes(req.user.role)) fail(403, 'Permission denied');
  next();
};
