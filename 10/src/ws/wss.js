import { WebSocketServer } from 'ws';
import { URL } from 'node:url';
import { config } from '../config.js';
import { verifyToken } from '../utils/jwt.js';
import { ConnectionManager } from './connection-manager.js';
import { RoomManager } from './room-manager.js';
import { MessageDispatcher } from './dispatcher.js';

export function setupWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const cm = new ConnectionManager();
  const rm = new RoomManager(cm);
  const dispatcher = new MessageDispatcher(cm, rm);

  // Обработка HTTP Upgrade с аутентификацией по JWT
  httpServer.on('upgrade', (req, socket, head) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (reqUrl.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const token = reqUrl.searchParams.get('token') || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nОтсутствует JWT токен');
      socket.destroy();
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nНедействительный или истекший JWT токен');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, user);
    });
  });

  wss.on('connection', (ws, req, user) => {
    const client = cm.addClient(ws, user);
    console.log(`[WS] Пользователь "${user.username}" (${user.sub}) подключен. Всего онлайн: ${cm.clients.size}`);

    // Отправляем приветственный пакет
    cm.send(ws, 'system:welcome', {
      message: 'Успешное дуплексное подключение к серверу WebSocket',
      user: { id: user.sub, username: user.username },
      serverTime: new Date().toISOString()
    });

    ws.on('message', (message) => {
      dispatcher.dispatch(ws, message.toString());
    });

    ws.on('pong', () => {
      const c = cm.getClient(ws);
      if (c) c.isAlive = true;
    });

    ws.on('close', (code, reason) => {
      rm.leaveAll(ws);
      cm.removeClient(ws);
      console.log(`[WS] Пользователь "${user.username}" отключен (${code}). Онлайн: ${cm.clients.size}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS ERROR] ${user.username}:`, err.message);
    });
  });

  // Heartbeat / Ping-Pong таймер
  const heartbeatInterval = setInterval(() => {
    for (const [ws, client] of cm.clients.entries()) {
      if (client.isAlive === false) {
        console.warn(`[WS TIMEOUT] Клиент ${client.username} не ответил на ping. Разрыв соединения...`);
        ws.terminate();
        continue;
      }
      client.isAlive = false;
      ws.ping();
    }
  }, config.pingIntervalMs);

  if (heartbeatInterval.unref) heartbeatInterval.unref();

  return { wss, cm, rm, heartbeatInterval };
}
