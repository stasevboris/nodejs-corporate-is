import express from 'express';
import { config } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/documents.routes.js';
import adminRoutes from './routes/admin.routes.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/documents', documentRoutes);
  app.use('/api/v1', adminRoutes);

  // Централизованный обработчик ошибок
  app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message
      }
    });
  });

  return app;
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[Lab08 DMS] Сервер запущен на http://localhost:${config.port}`);
    console.log(`Auth endpoints: http://localhost:${config.port}/api/v1/auth/login`);
  });
}
