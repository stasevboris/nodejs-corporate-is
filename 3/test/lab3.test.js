import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AuditMonitor } from '../src/emitter/audit-monitor.js';
import { ParserStream } from '../src/streams/parser-stream.js';
import { SanitizerStream } from '../src/streams/sanitizer-stream.js';

test('AuditMonitor emits security:alert on SQL injection and XSS', () => {
  const monitor = new AuditMonitor();
  let alertsCount = 0;

  monitor.on('security:alert', (data) => {
    alertsCount++;
    assert.ok(data.threats.length > 0);
  });

  monitor.recordEntry({
    id: '1',
    url: "/items?q=' OR '1'='1",
    statusCode: 200,
    ip: '10.0.0.1'
  });

  monitor.recordEntry({
    id: '2',
    url: '/feedback',
    body: '<script>alert(1)</script>',
    statusCode: 200,
    ip: '10.0.0.2'
  });

  assert.equal(alertsCount, 2);
  assert.equal(monitor.stats.alertsCount, 2);
});

test('AuditMonitor emits threshold:exceeded when limit reached', () => {
  const monitor = new AuditMonitor({ alertThreshold: 2 });
  let thresholdTriggered = false;

  monitor.on('threshold:exceeded', (evt) => {
    thresholdTriggered = true;
    assert.equal(evt.type, 'SECURITY_ALERTS_THRESHOLD');
  });

  monitor.recordEntry({ id: '1', url: "admin' OR 1=1" });
  monitor.recordEntry({ id: '2', url: "user' OR 1=1" });

  assert.ok(thresholdTriggered);
});

test('ParserStream parses chunked NDJSON stream correctly', async () => {
  const parser = new ParserStream();
  const inputChunks = [
    '{"id": 1, "msg": "fi',
    'rst"}\n{"id": 2, "msg": ',
    '"second"}\n'
  ];

  const results = [];
  const readable = Readable.from(inputChunks);
  const writable = new Writable({
    objectMode: true,
    write(chunk, enc, cb) {
      results.push(chunk);
      cb();
    }
  });

  await pipeline(readable, parser, writable);

  assert.equal(results.length, 2);
  assert.equal(results[0].id, 1);
  assert.equal(results[0].msg, 'first');
  assert.equal(results[1].id, 2);
  assert.equal(results[1].msg, 'second');
});

test('SanitizerStream masks IP, email and Bearer tokens', async () => {
  const monitor = new AuditMonitor();
  const sanitizer = new SanitizerStream(monitor);

  const rawEntries = [
    {
      id: 1,
      ip: '192.168.1.105',
      userEmail: 'alice.smith@company.org',
      authorization: 'Bearer super_secret_jwt_access_token_xyz'
    }
  ];

  const results = [];
  const readable = Readable.from(rawEntries);
  const writable = new Writable({
    objectMode: true,
    write(chunk, enc, cb) {
      results.push(chunk);
      cb();
    }
  });

  await pipeline(readable, sanitizer, writable);

  assert.equal(results.length, 1);
  assert.equal(results[0].ip, '192.168.***.***');
  assert.match(results[0].userEmail, /^al\*\*\*@company\.org$/);
  assert.match(results[0].authorization, /^Bearer super_[\*]+/);
});
