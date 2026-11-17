import User from '../models/User.js';
import { verifyPassword } from '../utils/password.js';
import { timingSafeEqual } from 'node:crypto';
import { signAccessToken } from '../utils/token.js';
import { fail } from '../validators/auth.js';

export function publicUser(user) {
  return { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, isActive: user.isActive, phone: user.phone || '', gender: user.gender || '', birthDate: user.birthDate || '' };
}
export async function createUser({ fullName, email, password, role }) {
  try {
    return await User.create({ fullName, email, password, role });
  } catch (error) {
    if (error.code === 11000) fail(409, 'Email is already registered');
    throw error;
  }
}
export function authResponse(user) {
  return { user: publicUser(user), accessToken: signAccessToken(user), tokenType: 'Bearer', expiresIn: 3600 };
}
export async function passwordMatches(user, password) {
  // Retain support for accounts created before plaintext storage was requested.
  const fallback = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
  let matches;
  if (typeof user?.password === 'string') {
    const provided = Buffer.from(password);
    const stored = Buffer.from(user.password);
    matches = provided.length === stored.length && timingSafeEqual(provided, stored);
  } else {
    matches = await verifyPassword(password, user?.passwordHash || fallback);
  }
  return matches;
}
export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password +passwordHash');
  if (!user || !await passwordMatches(user, password) || !user.isActive || user.deletedAt) fail(401, 'Invalid email or password');
  return authResponse(user);
}
