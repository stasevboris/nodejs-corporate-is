import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';

let serverContext;
let baseUrl;

before(async () => {
  serverContext = await startServer(0); // dynamic port
  baseUrl = `http://127.0.0.1:${serverContext.port}`;
});

after(async () => {
  await new Promise(resolve => serverContext.httpServer.close(resolve));
});

test('HTTP GET /api/system/info returns valid status', async () => {
  const res = await fetch(`${baseUrl}/api/system/info`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.nodeVersion);
});

test('HTTP GET /api/inventory/products returns products list', async () => {
  const res = await fetch(`${baseUrl}/api/inventory/products`);
  assert.equal(res.status, 200);
  const items = await res.json();
  assert.ok(items.length >= 3);
});

test('HTTP POST /api/auth/login returns JWT tokens and user', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'BorisTest', role: 'ADMIN' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.accessToken);
  assert.ok(data.refreshToken);
  assert.equal(data.user.username, 'BorisTest');
});

test('HTTP GET /api/articles returns REST collection', async () => {
  const res = await fetch(`${baseUrl}/api/articles`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.items.length >= 1);
});
