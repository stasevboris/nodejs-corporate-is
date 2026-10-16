import { Router } from 'express';
import { CryptoUtils } from '../utils/crypto.js';
import { config } from '../config.js';

const router = Router();

// GET /demo/xss-check - демонстрация недоступности HttpOnly кук для JS
router.get('/xss-check', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`
    <!DOCTYPE html>
    <html>
    <head><title>Проверка HttpOnly</title></head>
    <body>
      <h1>Проверка безопасности HttpOnly</h1>
      <p>Скрипт попытался прочитать <code>document.cookie</code>:</p>
      <div id="result" style="padding: 10px; background: #eee;"></div>
      <script>
        document.getElementById('result').innerText = document.cookie || '(Куки недоступны через JavaScript - защита активна!)';
      </script>
      <br>
      <a href="/">Назад</a>
    </body>
    </html>
  `);
});

// POST /demo/tamper-test - проверка обнаружения фальсификации кук
router.post('/tamper-test', (req, res) => {
  const { fakeSessionId, fakeSignature } = req.body || {};
  const fakeCookie = `s:${fakeSessionId || 'fake-session-id'}.${fakeSignature || 'bad-signature'}`;
  const verified = CryptoUtils.unsign(fakeCookie);

  res.json({
    submitted: fakeCookie,
    verifiedResult: verified,
    status: verified === null ? 'REJECTED_SUCCESSFULLY' : 'ACCEPTED_VULNERABLE',
    explanation: verified === null 
      ? 'Сервер успешно обнаружил невалидную подпись HMAC и отклонил поддельную сессию.'
      : 'Уязвимость! Невалидная подпись была принята.'
  });
});

export default router;
