import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

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

test('GET /health returns 200 with X-Request-Id header', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('x-request-id'));
  const data = await res.json();
  assert.equal(data.status, 'UP');
});

test('GET /api/v1/tickets returns paginated list of tickets', async () => {
  const res = await fetch(`${baseUrl}/api/v1/tickets`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.total >= 2);
  assert.equal(data.page, 1);
  assert.ok(Array.isArray(data.items));
});

test('POST /api/v1/tickets creates ticket with valid data and sanitizes tags', async () => {
  const newTicket = {
    title: '  Ошибка 502 на шлюзе  ',
    description: 'В логах Nginx фиксируются сбои upstream',
    priority: 'critical',
    status: 'open',
    tags: ['  Nginx  ', 'GATEWAY', '']
  };

  const res = await fetch(`${baseUrl}/api/v1/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTicket)
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.title, 'Ошибка 502 на шлюзе'); // trimmed
  assert.deepEqual(data.tags, ['nginx', 'gateway']); // lowercased & filtered
  assert.ok(data.id);
});

test('router.param validates UUID format and rejects invalid UUID with 400', async () => {
  const res = await fetch(`${baseUrl}/api/v1/tickets/invalid-not-uuid`);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error.code, 'VALIDATION_ERROR');
  assert.match(data.error.message, /UUID/);
});

test('GET /api/v1/tickets/:id returns 404 for non-existent UUID', async () => {
  const fakeUuid = '00000000-0000-0000-0000-000000000000';
  const res = await fetch(`${baseUrl}/api/v1/tickets/${fakeUuid}`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error.code, 'NOT_FOUND');
});

test('PATCH and DELETE operations work properly on existing ticket', async () => {
  const seedId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

  // 1. PATCH
  const patchRes = await fetch(`${baseUrl}/api/v1/tickets/${seedId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' })
  });
  assert.equal(patchRes.status, 200);
  const patched = await patchRes.json();
  assert.equal(patched.status, 'resolved');

  // 2. DELETE
  const delRes = await fetch(`${baseUrl}/api/v1/tickets/${seedId}`, { method: 'DELETE' });
  assert.equal(delRes.status, 204);

  // 3. Check gone
  const getGone = await fetch(`${baseUrl}/api/v1/tickets/${seedId}`);
  assert.equal(getGone.status, 404);
});

test('Malformed JSON body returns 400 via centralized error handler', async () => {
  const res = await fetch(`${baseUrl}/api/v1/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ "title": "test", broken json '
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error.code, 'VALIDATION_ERROR');
});
