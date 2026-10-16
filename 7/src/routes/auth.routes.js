import { Router } from 'express';
import { CryptoUtils } from '../utils/crypto.js';
import { config } from '../config.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  // Для демонстрации: принимаем пользователя demo / secret123
  if (username !== 'demo' || password !== 'secret123') {
    return res.status(401).json({ error: 'Неверные учетные данные' });
  }

  const fingerprint = CryptoUtils.generateFingerprint(req);

  // Регенерация ID сессии для защиты от Session Fixation!
  const newSession = req.sessionStore.regenerate(req.sessionId, fingerprint);

  req.sessionId = newSession.id;
  req.session = newSession.data;

  req.session.isGuest = false;
  req.session.user = {
    id: 101,
    username: 'demo',
    email: 'demo@stefan-lab.local',
    role: 'administrator'
  };

  res.json({
    message: 'Аутентификация успешна. Сессия регенерирована.',
    user: req.session.user
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  if (req.sessionId) {
    req.sessionStore.destroy(req.sessionId);
  }

  // Обнуление cookie на клиенте
  res.setHeader(
    'Set-Cookie',
    `${config.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );

  res.json({ message: 'Сеанс завершен, cookie очищена.' });
});

export default router;
