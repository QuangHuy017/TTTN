import jwt from 'jsonwebtoken';
import { requireJwtSecret } from '../config/env.js';
const options = { algorithm: 'HS256', issuer: 'equipment-rental-api', audience: 'equipment-rental-web', expiresIn: '1h' };
export function signAccessToken(user) {
  return jwt.sign({ version: user.tokenVersion || 0 }, requireJwtSecret(), { ...options, subject: String(user._id) });
}
export function verifyAccessToken(token) {
  return jwt.verify(token, requireJwtSecret(), { algorithms: ['HS256'], issuer: options.issuer, audience: options.audience });
}
