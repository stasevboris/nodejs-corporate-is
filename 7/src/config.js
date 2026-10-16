export const config = {
  port: parseInt(process.env.PORT, 10) || 3007,
  sessionSecret: process.env.SESSION_SECRET || 'lab07_super_secure_secret_key_hmac_2026',
  cookieName: 'connect.sid',
  idleTimeoutMs: 15 * 60 * 1000, // 15 минут
  absoluteLifetimeMs: 24 * 60 * 60 * 1000, // 24 часа
  isProd: process.env.NODE_ENV === 'production'
};
