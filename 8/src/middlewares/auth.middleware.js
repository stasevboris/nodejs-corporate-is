import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { db } from '../db/in-memory-db.js';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Отсутствует или недействителен заголовок Authorization: Bearer <token>'));
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret);
    const user = db.users.get(decoded.sub);

    if (!user || !user.isActive) {
      return next(new UnauthorizedError('Пользователь деактивирован или удален'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Срок действия Access Token истек', 'TOKEN_EXPIRED'));
    }
    return next(new UnauthorizedError('Невалидный Access Token'));
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Роль "${req.user.role}" не имеет прав на данное действие. Требуется: ${allowedRoles.join(' или ')}`));
    }
    next();
  };
}
