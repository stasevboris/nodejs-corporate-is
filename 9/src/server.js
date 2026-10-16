import express from 'express';
import { config } from './config/env.js';
import articlesRouter from './routes/articles.routes.js';
import { rfc7807ErrorHandler } from './middlewares/error.middleware.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.use('/api/v1/articles', articlesRouter);

  // 404
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/problem+json');
    res.status(404).json({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: `Маршрут ${req.method} ${req.originalUrl} не существует`,
      instance: req.originalUrl
    });
  });

  // Centralized RFC 7807 Error Handler
  app.use(rfc7807ErrorHandler);

  return app;
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[PublishHub REST] Сервер запущен на http://localhost:${config.port}`);
    console.log(`Articles API: http://localhost:${config.port}/api/v1/articles`);
  });
}
