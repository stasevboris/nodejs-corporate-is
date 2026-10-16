export const config = {
  port: parseInt(process.env.PORT, 10) || 3008,
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'lab08_access_jwt_secret_default_key',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'lab08_refresh_jwt_secret_default_key',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS, 10) || 7
};
