import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { signToken } from './utils/jwt.js';
import { setupWebSocket } from './ws/wss.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

export function createServer() {
  const server = http.createServer((req, res) => {
    // API выдачи демо-токенов
    if (req.method === 'POST' && req.url === '/api/token') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const username = parsed.username || `User_${Math.floor(Math.random() * 1000)}`;
          const token = signToken({ id: `usr-${Date.now()}`, username });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ token, username }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // Раздача статики
    const safeUrl = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(PUBLIC_DIR, safeUrl.split('?')[0]);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found');
      }

      const ext = path.extname(filePath);
      const mimes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8'
      };
      res.writeHead(200, {
        'Content-Type': mimes[ext] || 'text/plain',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  const wsContext = setupWebSocket(server);
  return { server, wsContext };
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const { server } = createServer();
  server.listen(config.port, () => {
    console.log(`[WebSocket Server] Сервер запущен на http://localhost:${config.port}`);
    console.log(`Web UI: http://localhost:${config.port}/`);
    console.log(`WebSocket URL: ws://localhost:${config.port}/ws?token=<jwt>`);
  });
}
