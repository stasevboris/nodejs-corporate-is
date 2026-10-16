import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { Readable } from 'node:stream';
import { config } from './config/env.js';

// Модули 1-2
import { collectSystemInfo } from './modules/system-automation/system-info.js';
import { runProcess } from './modules/system-automation/exec.js';
import { runPipeline } from './modules/system-automation/pipeline.js';

// Модули 3-4
import { AuditMonitor } from './modules/stream-gateway/audit-monitor.js';
import { ParserStream } from './modules/stream-gateway/parser-stream.js';
import { SanitizerStream } from './modules/stream-gateway/sanitizer-stream.js';

// Модули 5-6
import { getDatabase } from './modules/express-database/db.js';
import { InventoryRepo } from './modules/express-database/inventory.repo.js';
import { InventoryService } from './modules/express-database/inventory.service.js';
import { requestIdMiddleware, responseTimeMiddleware, rfcErrorHandler } from './modules/express-database/middlewares.js';

// Модули 7-8
import { sessionMiddleware, authenticateJwt, authorizeRoles } from './modules/auth-security/middlewares.js';
import { TokenService, dbUsers } from './modules/auth-security/token.service.js';

// Модули 9-10
import { articlesRepo } from './modules/rest-realtime/articles.repo.js';
import { articleCreateSchema, articleUpdateSchema } from './modules/rest-realtime/article.schema.js';
import { ConnectionManager, RoomManager } from './modules/rest-realtime/ws-manager.js';
import { MessageDispatcher } from './modules/rest-realtime/dispatcher.js';

export function createApp() {
  const app = express();
  const db = getDatabase();
  const inventoryRepo = new InventoryRepo(db);
  const inventoryService = new InventoryService(db);
  const auditMonitor = new AuditMonitor({ alertThreshold: 3 });

  // 1. Глобальные промежуточные обработчики (Темы 5-6)
  app.use(requestIdMiddleware);
  app.use(responseTimeMiddleware);
  app.use(sessionMiddleware);
  app.use(express.json({ limit: '1mb' }));

  // 2. Раздача статики (Дашборд) с защитой от кэширования
  app.use(express.static(config.rootDir + '/public', {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }));

  // ==========================================
  // МОДУЛЬ 1-2: СИСТЕМНАЯ ДИАГНОСТИКА И ПРОЦЕССЫ
  // ==========================================
  app.get('/api/system/info', (req, res) => {
    res.json(collectSystemInfo());
  });

  app.post('/api/system/exec', async (req, res) => {
    const { command, timeout } = req.body;
    const result = await runProcess(command, parseInt(timeout, 10) || 0);
    res.json(result);
  });

  app.post('/api/system/pipeline', async (req, res) => {
    const { tasks, mode } = req.body;
    const result = await runPipeline(tasks || [], mode || 'series');
    res.json(result);
  });

  // ==========================================
  // МОДУЛЬ 3-4: ПОТОКИ И АУДИТ БЕЗОПАСНОСТИ
  // ==========================================
  app.get('/api/stream/audit-stats', (req, res) => {
    res.json(auditMonitor.getSummary());
  });

  app.post('/api/stream/audit-simulate', (req, res, next) => {
    const sampleLogs = req.body.logs || [
      JSON.stringify({ ip: '192.168.1.100', email: 'user@corp.com', url: '/search?q=normal', authorization: 'Bearer abcdef123456789' }),
      JSON.stringify({ ip: '10.0.0.55', email: 'attacker@corp.com', url: "/login?user=' OR 1=1--", authorization: 'Bearer secret_attacker_token' }),
      JSON.stringify({ ip: '172.16.0.4', email: 'tester@corp.com', url: '/files?path=../../etc/passwd' }),
      JSON.stringify({ ip: '192.168.1.200', email: 'victim@corp.com', url: '/comment?body=<script>alert(1)</script>' })
    ].join('\n') + '\n';

    const readable = Readable.from([sampleLogs]);
    const parser = new ParserStream();
    const sanitizer = new SanitizerStream(auditMonitor);
    const sanitizedEntries = [];

    sanitizer.on('data', entry => sanitizedEntries.push(entry));
    sanitizer.on('end', () => {
      res.json({
        processed: sanitizedEntries.length,
        sanitizedEntries,
        monitorStats: auditMonitor.getSummary()
      });
    });
    sanitizer.on('error', next);

    readable.pipe(parser).pipe(sanitizer);
  });

  // ==========================================
  // МОДУЛЬ 5-6: БАЗА ДАННЫХ И ТРАНЗАКЦИИ SQLITE
  // ==========================================
  app.get('/api/inventory/products', (req, res) => {
    const search = req.query.search || '';
    const catId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : null;
    res.json(inventoryRepo.findAllProducts(search, catId));
  });

  app.get('/api/inventory/categories', (req, res) => {
    res.json(inventoryRepo.findAllCategories());
  });

  app.post('/api/inventory/adjust', (req, res, next) => {
    const { productId, changeAmount, reason } = req.body;
    try {
      const result = inventoryService.adjustStock(
        parseInt(productId, 10),
        parseInt(changeAmount, 10),
        reason || 'Корпоративная операция'
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/inventory/logs', (req, res) => {
    res.json(inventoryRepo.getRecentLogs(20));
  });

  // ==========================================
  // МОДУЛЬ 7-8: СЕССИИ, КУКИ И АВТОРИЗАЦИЯ JWT/RBAC
  // ==========================================
  app.get('/api/session/state', (req, res) => {
    res.json({
      sessionId: req.sessionId,
      sessionData: req.session
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, role } = req.body;
    const user = {
      id: `usr-${Date.now()}`,
      username: username || 'BorisStasev',
      role: role || 'ADMIN',
      email: `${(username || 'boris').toLowerCase()}@enterprise.local`
    };
    dbUsers.set(user.id, user);

    const tokenPair = TokenService.issueTokenPair(user);
    req.session.user = user;
    req.session.isGuest = false;

    res.json({ user, ...tokenPair });
  });

  app.post('/api/auth/refresh', (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const newPair = TokenService.rotateRefreshToken(refreshToken);
      res.json(newPair);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  });

  app.get('/api/auth/profile', authenticateJwt, (req, res) => {
    res.json({
      message: 'Успешная JWT авторизация',
      user: req.user
    });
  });

  app.get('/api/auth/admin-zone', authenticateJwt, authorizeRoles('ADMIN'), (req, res) => {
    res.json({
      status: 'CONFIDENTIAL',
      message: 'Доступ разрешен: только для роли ADMIN'
    });
  });

  // ==========================================
  // МОДУЛЬ 9-10: RESTful API (ETag, Zod, HATEOAS)
  // ==========================================
  app.get('/api/articles', (req, res) => {
    const items = articlesRepo.findAll(req.query);
    const enriched = items.map(a => ({
      ...a,
      _links: {
        self: `/api/articles/${a.id}`,
        etag: articlesRepo.generateETag(a)
      }
    }));
    res.json({ total: enriched.length, items: enriched });
  });

  app.get('/api/articles/:id', (req, res, next) => {
    const article = articlesRepo.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Статья не найдена' });

    const etag = articlesRepo.generateETag(article);
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.json({
      ...article,
      _links: { self: `/api/articles/${article.id}` }
    });
  });

  app.post('/api/articles', (req, res, next) => {
    const parsed = articleCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ошибка валидации Zod', details: parsed.error.issues });
    }
    const created = articlesRepo.create(parsed.data);
    res.status(201).json(created);
  });

  app.put('/api/articles/:id', (req, res, next) => {
    const existing = articlesRepo.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Статья не найдена' });

    const ifMatch = req.headers['if-match'];
    const currentEtag = articlesRepo.generateETag(existing);
    if (!ifMatch) {
      return res.status(428).json({ error: 'Precondition Required: требуется заголовок If-Match' });
    }
    if (ifMatch !== currentEtag && ifMatch !== '*') {
      return res.status(412).json({ error: 'Precondition Failed: ресурс изменен (Lost Update Defense)' });
    }

    const parsed = articleUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ошибка валидации Zod', details: parsed.error.issues });
    }

    const updated = articlesRepo.update(existing.id, parsed.data);
    res.setHeader('ETag', articlesRepo.generateETag(updated));
    res.json(updated);
  });

  app.delete('/api/articles/:id', (req, res) => {
    articlesRepo.delete(req.params.id);
    res.status(204).end();
  });

  // 404 & Centralized RFC 7807 Error Handler
  app.use((req, res) => {
    res.status(404).json({
      type: 'https://enterprise.internal/errors/404',
      title: 'Not Found',
      status: 404,
      detail: `Маршрут ${req.method} ${req.originalUrl} не найден`
    });
  });

  app.use(rfcErrorHandler);

  return app;
}

export function startServer(port = config.port) {
  const app = createApp();
  const httpServer = http.createServer(app);

  // WebSocket Server на HTTP Upgrade (Темы 9-10)
  const wss = new WebSocketServer({ noServer: true });
  const cm = new ConnectionManager();
  const rm = new RoomManager(cm);
  const dispatcher = new MessageDispatcher(cm, rm);

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const token = url.searchParams.get('token') || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    let user = { id: `guest-${Date.now()}`, username: 'Guest' };

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        user = { id: decoded.sub || decoded.id, username: decoded.username || 'User' };
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\nНедействительный JWT токен');
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, user);
    });
  });

  wss.on('connection', (ws, req, user) => {
    cm.addClient(ws, user);
    cm.send(ws, 'system:welcome', {
      message: 'Успешное дуплексное подключение к Корпоративному Хабу',
      user: { id: user.id, username: user.username },
      serverTime: new Date().toISOString()
    });

    ws.on('message', raw => dispatcher.dispatch(ws, raw.toString()));

    ws.on('close', () => {
      rm.leaveAll(ws);
      cm.removeClient(ws);
    });
  });

  const heartbeat = setInterval(() => {
    for (const [ws, client] of cm.clients.entries()) {
      if (client.isAlive === false) {
        ws.terminate();
        continue;
      }
      client.isAlive = false;
      ws.ping();
    }
  }, config.pingIntervalMs);
  if (heartbeat.unref) heartbeat.unref();

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      resolve({ httpServer, wss, cm, rm, port: httpServer.address().port });
    });
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const { port } = await startServer(config.port);
  console.log('='.repeat(65));
  console.log(`[ENTERPRISE SYSTEM] Единая система запущена на http://localhost:${port}`);
  console.log(`- Веб-дашборд 5 модулей: http://localhost:${port}/`);
  console.log(`- WebSocket Real-Time: ws://localhost:${port}/ws`);
  console.log('='.repeat(65));
}
