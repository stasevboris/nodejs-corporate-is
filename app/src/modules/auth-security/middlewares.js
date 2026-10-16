import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { CryptoUtils } from './crypto.js';
import { sessionStore } from './session-store.js';

export function sessionMiddleware(req, res, next) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const p = c.trim().split('=');
      return [p[0], p.slice(1).join('=')];
    })
  );

  const rawCookie = cookies[config.cookieName];
  const fingerprint = CryptoUtils.generateFingerprint(req);
  let session = null;

  if (rawCookie) {
    const unsignedId = CryptoUtils.unsign(decodeURIComponent(rawCookie));
    if (unsignedId) {
      session = sessionStore.get(unsignedId, fingerprint);
    }
  }

  let isNew = false;
  if (!session) {
    session = sessionStore.create({}, fingerprint);
    isNew = true;
  }

  req.session = session.data;
  req.sessionId = session.id;

  if (isNew) {
    const signed = CryptoUtils.sign(session.id);
    res.setHeader('Set-Cookie', `${config.cookieName}=${encodeURIComponent(signed)}; Path=/; HttpOnly; SameSite=Lax`);
  }

  const origEnd = res.end;
  res.end = function (...args) {
    sessionStore.update(req.sessionId, req.session);
    return origEnd.apply(this, args);
  };
  next();
}

export function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется токен Bearer в заголовке Authorization' });
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалидный или истекший Access Token' });
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Доступ запрещён: требуется одна из ролей [${roles.join(', ')}]`
      });
    }
    next();
  };
}
