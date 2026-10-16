export const config = {
  port: parseInt(process.env.PORT, 10) || 3009,
  baseUrl: process.env.BASE_URL || 'http://localhost:3009',
  isProd: process.env.NODE_ENV === 'production'
};
