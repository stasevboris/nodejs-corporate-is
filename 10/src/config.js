export const config = {
  port: parseInt(process.env.PORT, 10) || 3010,
  jwtSecret: process.env.JWT_SECRET || 'lab10_ws_default_secret_key_2026',
  pingIntervalMs: parseInt(process.env.PING_INTERVAL_MS, 10) || 15000,
  isProd: process.env.NODE_ENV === 'production'
};
