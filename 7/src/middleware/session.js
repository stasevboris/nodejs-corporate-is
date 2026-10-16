import { sessionStore } from '../store/session-store.js';
import { CryptoUtils } from '../utils/crypto.js';
import { config } from '../config.js';

export function sessionMiddleware(req, res, next) {
  req.sessionStore = sessionStore;
  const rawCookieHeader = req.headers.cookie || '';
  const fingerprint = CryptoUtils.generateFingerprint(req);

  // Извлекаем cookie по имени
  const cookies = Object.fromEntries(
    rawCookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );

  const rawCookieVal = cookies[config.cookieName];
  let session = null;

  if (rawCookieVal) {
    const unsignedId = CryptoUtils.unsign(decodeURIComponent(rawCookieVal));
    if (unsignedId) {
      session = sessionStore.get(unsignedId, fingerprint);
    } else {
      console.warn('[SECURITY] Обнаружена попытка подделки подписи cookie!');
    }
  }

  let isNew = false;
  if (!session) {
    session = sessionStore.create({}, fingerprint);
    isNew = true;
  }

  req.session = session.data;
  req.sessionId = session.id;

  // Функция для установки заголовка Set-Cookie
  const applyCookie = (sid) => {
    const signed = CryptoUtils.sign(sid);
    const cookieParts = [
      `${config.cookieName}=${encodeURIComponent(signed)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${Math.floor(config.idleTimeoutMs / 1000)}`
    ];
    if (config.isProd) {
      cookieParts.push('Secure');
    }
    res.setHeader('Set-Cookie', cookieParts.join('; '));
  };

  if (isNew) {
    applyCookie(session.id);
  }

  // Перехват окончания запроса для синхронизации данных сессии
  const originalEnd = res.end;
  res.end = function (...args) {
    // Если сессия была регенерирована в процессе запроса
    if (req.sessionId && req.sessionId !== session.id) {
      applyCookie(req.sessionId);
    }
    sessionStore.update(req.sessionId, req.session);
    return originalEnd.apply(this, args);
  };

  next();
}
