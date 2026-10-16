import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { AuditMonitor } from '../src/modules/stream-gateway/audit-monitor.js';
import { ParserStream } from '../src/modules/stream-gateway/parser-stream.js';
import { SanitizerStream } from '../src/modules/stream-gateway/sanitizer-stream.js';
import { NativeRouter } from '../src/modules/stream-gateway/native-router.js';

test('[Модуль 3-4] AuditMonitor детектирует угрозы SQLi и XSS', () => {
  const monitor = new AuditMonitor({ alertThreshold: 2 });
  const alerts = [];
  monitor.on('security:alert', a => alerts.push(a));

  monitor.recordEntry({ url: "/login?user=' OR 1=1--" });
  monitor.recordEntry({ body: '<script>alert("hack")</script>' });

  assert.equal(alerts.length, 2);
  assert.ok(alerts[0].threats.includes('SQL_INJECTION'));
  assert.ok(alerts[1].threats.includes('XSS_ATTACK'));
});

test('[Модуль 3-4] Конвейер потоков ParserStream -> SanitizerStream маскирует данные', async () => {
  const input = JSON.stringify({ ip: '192.168.1.50', email: 'boris@corp.by', authorization: 'Bearer 1234567890abcdef' }) + '\n';
  const readable = Readable.from([input]);
  const parser = new ParserStream();
  const sanitizer = new SanitizerStream();

  const results = [];
  sanitizer.on('data', d => results.push(d));

  await new Promise((resolve, reject) => {
    readable.pipe(parser).pipe(sanitizer).on('end', resolve).on('error', reject);
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].ip, '192.168.***.***');
  assert.equal(results[0].email, 'bo***@corp.by');
  assert.equal(results[0].authorization, 'Bearer 123456******');
});

test('[Модуль 3-4] NativeRouter извлекает параметры из URL', () => {
  const router = new NativeRouter();
  router.add('GET', '/api/users/:userId/roles/:roleId', () => {});
  const match = router.match('GET', '/api/users/usr-42/roles/admin');
  assert.ok(match);
  assert.equal(match.params.userId, 'usr-42');
  assert.equal(match.params.roleId, 'admin');
});
