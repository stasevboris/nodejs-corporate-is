import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { CryptoUtils } from '../src/utils/crypto.js';
import { SessionStore } from '../src/store/session-store.js';

let app;
let server;
let baseUrl;

before(async () => {
  app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('CryptoUtils correctly signs and unsigns values with HMAC-SHA256', () => {
  const secret = 'test-secret';
  const val = 'session-id-12345';
  const signed = CryptoUtils.sign(val, secret);

  assert.ok(signed.startsWith('s:session-id-12345.'));
  const unsigned = CryptoUtils.unsign(signed, secret);
  assert.equal(unsigned, val);

  // Поддельная подпись должна возвращать null
  const tampered = signed.slice(0, -5) + 'xxxxx';
  const failed = CryptoUtils.unsign(tampered, secret);
  assert.equal(failed, null);
});

test('GET /api/session creates guest session and sets HttpOnly signed cookie', async () => {
  const res = await fetch(`${baseUrl}/api/session`);
  assert.equal(res.status, 200);

  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie);
  assert.match(setCookie, /connect\.sid=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);

  const data = await res.json();
  assert.equal(data.isGuest, true);
  assert.equal(data.user, null);
});

test('Cookie tampering is rejected by session middleware', async () => {
  const fakeCookie = 'connect.sid=s%3Afakeid123.invalidsignature';
  const res = await fetch(`${baseUrl}/api/session`, {
    headers: { 'Cookie': fakeCookie }
  });
  assert.equal(res.status, 200);

  const setCookie = res.headers.get('set-cookie');
  // Должен выдать новую сессию взамен скомпрометированной
  assert.ok(setCookie);
});

test('Login regenerates session ID and grants access to protected /api/profile', async () => {
  // 1. Создаем гостевую сессию
  const initRes = await fetch(`${baseUrl}/api/session`);
  const initCookie = initRes.headers.get('set-cookie').split(';')[0];
  const initData = await initRes.json();
  const guestSessionId = initData.sessionId;

  // 2. Пытаемся зайти в /api/profile как гость -> 401
  const unauthRes = await fetch(`${baseUrl}/api/profile`, {
    headers: { 'Cookie': initCookie }
  });
  assert.equal(unauthRes.status, 401);

  // 3. Выполняем вход (login)
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': initCookie
    },
    body: JSON.stringify({ username: 'demo', password: 'secret123' })
  });
  assert.equal(loginRes.status, 200);

  const loginCookie = loginRes.headers.get('set-cookie').split(';')[0];

  // 4. Проверяем, что в /api/profile доступ получен
  const profRes = await fetch(`${baseUrl}/api/profile`, {
    headers: { 'Cookie': loginCookie }
  });
  assert.equal(profRes.status, 200);
  const profData = await profRes.json();
  assert.equal(profData.profile.username, 'demo');
  assert.notEqual(profData.activeSessionId, guestSessionId); // Session Fixation Defense

  // 5. Logout
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': loginCookie }
  });
  assert.equal(logoutRes.status, 200);

  // 6. Профиль снова недоступен
  const afterLogoutRes = await fetch(`${baseUrl}/api/profile`, {
    headers: { 'Cookie': loginCookie }
  });
  assert.equal(afterLogoutRes.status, 401);
});

test('SessionStore handles idle timeout expiration', () => {
  const store = new SessionStore({ idleTimeoutMs: 50, absoluteLifetimeMs: 1000 });
  const s = store.create({ test: true });

  const fetchedImmediate = store.get(s.id);
  assert.ok(fetchedImmediate);

  // Имитируем простой > idleTimeoutMs
  s.lastAccessAt = Date.now() - 60;
  const fetchedExpired = store.get(s.id);
  assert.equal(fetchedExpired, null);

  store.close();
});
