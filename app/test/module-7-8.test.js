import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoUtils } from '../src/modules/auth-security/crypto.js';
import { SessionStore } from '../src/modules/auth-security/session-store.js';
import { TokenService, dbUsers } from '../src/modules/auth-security/token.service.js';

test('[Модуль 7-8] HMAC-SHA256 подпись и верификация (timingSafeEqual)', () => {
  const val = 'user-session-12345';
  const signed = CryptoUtils.sign(val);
  assert.ok(signed.startsWith('s:'));

  const unsigned = CryptoUtils.unsign(signed);
  assert.equal(unsigned, val);

  const tampered = signed.slice(0, -4) + 'abcd';
  assert.equal(CryptoUtils.unsign(tampered), null);
});

test('[Модуль 7-8] SessionStore защита от Session Hijacking по отпечатку клиента', () => {
  const store = new SessionStore();
  const session = store.create({ cart: ['item-1'] }, 'fp-browser-chrome-1');

  // Успешный доступ с тем же отпечатком
  const valid = store.get(session.id, 'fp-browser-chrome-1');
  assert.ok(valid);

  // Попытка доступа с чужим отпечатком (атака)
  const hijacked = store.get(session.id, 'fp-attacker-firefox-2');
  assert.equal(hijacked, null, 'Сессия должна быть уничтожена при несовпадении отпечатка');
});

test('[Модуль 7-8] Dual-Token JWT с ротацией RTR и Reuse Detection', () => {
  const user = dbUsers.get('usr-1');
  const pair1 = TokenService.issueTokenPair(user);
  assert.ok(pair1.accessToken);
  assert.ok(pair1.refreshToken);

  // Успешная ротация
  const pair2 = TokenService.rotateRefreshToken(pair1.refreshToken);
  assert.ok(pair2.accessToken);
  assert.notEqual(pair2.refreshToken, pair1.refreshToken);

  // Повторное использование отозванного токена pair1 (Reuse Attack!)
  assert.throws(() => {
    TokenService.rotateRefreshToken(pair1.refreshToken);
  }, /Компрометация токена/);
});
