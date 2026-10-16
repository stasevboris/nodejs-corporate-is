import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from '../db/in-memory-db.js';
import { TokenService } from '../services/token.service.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ValidationError, UnauthorizedError } from '../errors/app-error.js';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', (req, res, next) => {
  const { email, password, role = 'USER' } = req.body || {};

  if (!email || !password) {
    return next(new ValidationError('Email и пароль обязательны'));
  }

  // Проверка сложности пароля
  if (password.length < 8) {
    return next(new ValidationError('Пароль должен содержать не менее 8 символов'));
  }

  // Проверка уникальности email
  for (const u of db.users.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return next(new ValidationError('Пользователь с таким email уже зарегистрирован'));
    }
  }

  const allowedRoles = ['USER', 'MANAGER'];
  const assignedRole = allowedRoles.includes(role) ? role : 'USER';

  const newUser = {
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: assignedRole,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  db.users.set(newUser.id, newUser);
  db.logAudit(newUser.id, 'USER_REGISTERED', 'users', { email: newUser.email, role: newUser.role });

  res.status(201).json({
    message: 'Пользователь успешно зарегистрирован',
    user: { id: newUser.id, email: newUser.email, role: newUser.role }
  });
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return next(new ValidationError('Email и пароль обязательны'));
  }

  let user = null;
  for (const u of db.users.values()) {
    if (u.email.toLowerCase() === email.toLowerCase()) {
      user = u;
      break;
    }
  }

  if (!user || !user.isActive || !bcrypt.compareSync(password, user.passwordHash)) {
    return next(new UnauthorizedError('Неверный email или пароль'));
  }

  const tokens = await TokenService.issueTokenPair(user);
  db.logAudit(user.id, 'USER_LOGIN_SUCCESS', 'auth');

  res.json({
    message: 'Успешная аутентификация',
    user: { id: user.id, email: user.email, role: user.role },
    ...tokens
  });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      throw new ValidationError('Параметр refreshToken обязателен');
    }
    const newTokens = await TokenService.rotateRefreshToken(refreshToken);
    res.json(newTokens);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    TokenService.revokeToken(refreshToken);
  }
  res.json({ message: 'Сессия успешно завершена' });
});

// POST /api/v1/auth/logout-all
router.post('/logout-all', authenticate, (req, res) => {
  TokenService.revokeAllForUser(req.user.id);
  res.json({ message: 'Все активные сессии пользователя отозваны' });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
