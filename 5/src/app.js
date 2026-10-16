import express from 'express';
import { requestIdMiddleware } from './middlewares/request-id.js';
import { loggerMiddleware } from './middlewares/logger.js';
import ticketsRouter from './routes/tickets.routes.js';
import { notFoundHandler, centralizedErrorHandler } from './middlewares/error-handler.js';
import { ValidationError } from './errors/app-error.js';

export function createApp() {
  const app = express();

  // 1. Request ID Middleware
  app.use(requestIdMiddleware);

  // 2. Logging & Timing Middleware
  app.use(loggerMiddleware);

  // 3. JSON body parser with malformed JSON handler
  app.use(express.json({ limit: '1mb' }));
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return next(new ValidationError('Невалидный JSON синтаксис в теле запроса'));
    }
    next(err);
  });

  // 4. Common Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // 5. Health Check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // 6. Router
  app.use('/api/v1/tickets', ticketsRouter);

  // 7. 404 Handler
  app.use(notFoundHandler);

  // 8. Centralized Error Handler
  app.use(centralizedErrorHandler);

  return app;
}
