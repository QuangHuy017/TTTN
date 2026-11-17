import 'dotenv/config';
export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/equipment_loan',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
  jwtSecret: process.env.JWT_SECRET,
};
export function requireJwtSecret() {
  if (!env.jwtSecret || Buffer.byteLength(env.jwtSecret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  return env.jwtSecret;
}
