import { Router } from 'express';

const router = Router();

// GET /api/session
router.get('/', (req, res) => {
  res.json({
    sessionId: req.sessionId,
    isGuest: req.session.isGuest,
    user: req.session.user,
    preferences: req.session.preferences,
    cart: req.session.cart
  });
});

// POST /api/session/preferences
router.post('/preferences', (req, res) => {
  const { theme, lang } = req.body || {};
  if (theme) req.session.preferences.theme = theme;
  if (lang) req.session.preferences.lang = lang;

  res.json({
    message: 'Настройки обновлены',
    preferences: req.session.preferences
  });
});

// POST /api/session/cart
router.post('/cart', (req, res) => {
  const { item } = req.body || {};
  if (!item) {
    return res.status(400).json({ error: 'Элемент корзины не указан' });
  }
  req.session.cart.push(item);
  res.json({
    message: 'Товар добавлен в корзину',
    cart: req.session.cart
  });
});

export default router;
