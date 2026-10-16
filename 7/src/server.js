import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { sessionMiddleware } from './middleware/session.js';
import authRoutes from './routes/auth.routes.js';
import sessionRoutes from './routes/session.routes.js';
import demoRoutes from './routes/demo.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(sessionMiddleware);

  // Статика
  app.use(express.static(path.resolve(__dirname, '../public')));

  // Маршруты
  app.use('/api/auth', authRoutes);
  app.use('/api/session', sessionRoutes);
  app.use('/demo', demoRoutes);

  // Защищенный маршрут профиля
  app.get('/api/profile', (req, res) => {
    if (req.session.isGuest || !req.session.user) {
      return res.status(401).json({
        error: 'Доступ запрещен: требуется авторизованный сеанс'
      });
    }
    res.json({
      profile: req.session.user,
      activeSessionId: req.sessionId
    });
  });

  return app;
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[Lab07 Server] Сервер запущен на http://localhost:${config.port}`);
    console.log(`Демо интерфейс: http://localhost:${config.port}/`);
  });
}
