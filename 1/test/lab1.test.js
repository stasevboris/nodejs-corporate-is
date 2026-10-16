import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadEnv } from '../src/config.js';
import { collectSystemInfo } from '../src/system-info.js';

const require = createRequire(import.meta.url);
const utils = require('../src/utils.cjs');

test('CommonJS module utils.cjs exports correct functions', () => {
  assert.equal(typeof utils.formatBytes, 'function');
  assert.equal(typeof utils.formatUptime, 'function');
  assert.equal(typeof utils.getPlatformString, 'function');

  assert.equal(utils.formatBytes(0), '0 Bytes');
  assert.equal(utils.formatBytes(1024), '1 KB');
  assert.equal(utils.formatBytes(1048576), '1 MB');

  assert.match(utils.formatUptime(65), /1m 5s/);
  assert.match(utils.getPlatformString(), /\(/);
});

test('ESM dynamic import loads CJS module properly', async () => {
  const dynamicUtils = await import('../src/utils.cjs');
  const mod = dynamicUtils.default || dynamicUtils;
  assert.equal(typeof mod.formatBytes, 'function');
  assert.equal(mod.formatBytes(2048), '2 KB');
});

test('config module correctly loads fallback and variables', () => {
  const cfg = loadEnv('/non/existent/path/.env');
  assert.ok(cfg.PORT);
  assert.ok(cfg.NODE_ENV);
  assert.ok(cfg.APP_NAME);
});

test('system-info module returns valid diagnostic structure', () => {
  const info = collectSystemInfo();
  assert.ok(info.nodeVersion.startsWith('v'));
  assert.ok(info.cpuCount > 0);
  assert.ok(info.memory.total);
  assert.ok(info.uptime.process);
  assert.equal(typeof info.pid, 'number');
});
