import http from 'node:http';
import { URL } from 'node:url';
import { Router } from './router.js';
import { apiHandler } from './handlers/api.js';
import { serveStaticFile } from './handlers/static.js';
import { sendEmpty, sendError } from './utils/response.js';

export function createServer() {
  const router = new Router();

  // API маршруты
  router.get('/api/tasks', apiHandler.list);
  router.get('/api/tasks/:id', apiHandler.getOne);
  router.post('/api/tasks', apiHandler.create);
  router.put('/api/tasks/:id', apiHandler.update);
  router.patch('/api/tasks/:id', apiHandler.patch);
  router.delete('/api/tasks/:id', apiHandler.delete);

  const server = http.createServer((req, res) => {
    // Глобальная обработка OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
      return sendEmpty(res, 204);
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams.entries());

    // 1. Статические файлы
    if (pathname === '/' || pathname === '/index.html') {
      return serveStaticFile(req, res, 'index.html');
    }
    if (pathname.startsWith('/public/')) {
      const relPath = pathname.slice('/public/'.length);
      return serveStaticFile(req, res, relPath);
    }

    // 2. Поиск маршрута в API роутере
    const routeMatch = router.match(req.method, pathname);
    if (routeMatch) {
      return routeMatch.handler(req, res, routeMatch.params, query);
    }

    // 3. 404 Not Found
    sendError(res, 404, `Маршрут ${req.method} ${pathname} не найден`, 'NOT_FOUND');
  });

  return server;
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const PORT = process.env.PORT || 3004;
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`[NativeHttpServer] Сервер запущен на http://localhost:${PORT}`);
    console.log(`UI: http://localhost:${PORT}/`);
    console.log(`API: http://localhost:${PORT}/api/tasks`);
  });
}
