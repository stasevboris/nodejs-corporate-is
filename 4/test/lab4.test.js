import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET / returns static index.html with 200', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const text = await res.text();
  assert.ok(text.includes('Низкоуровневый HTTP-сервер'));
});

test('GET /public/style.css returns css with 200', async () => {
  const res = await fetch(`${baseUrl}/public/style.css`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/css/);
});

test('GET /public/../../etc/passwd returns 403 or 404 (Path Traversal protection)', async () => {
  const res = await fetch(`${baseUrl}/public/../../etc/passwd`);
  assert.ok([403, 404].includes(res.status));
});

test('OPTIONS /api/tasks handles CORS preflight with 204', async () => {
  const res = await fetch(`${baseUrl}/api/tasks`, { method: 'OPTIONS' });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

test('CRUD operations lifecycle on /api/tasks', async () => {
  // 1. List
  const listRes = await fetch(`${baseUrl}/api/tasks`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(Array.isArray(listData.items));

  // 2. Create (POST)
  const createRes = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Task from test', priority: 'high' })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.title, 'Task from test');
  const taskId = created.id;

  // 3. Get by ID
  const getRes = await fetch(`${baseUrl}/api/tasks/${taskId}`);
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json();
  assert.equal(fetched.id, taskId);

  // 4. Update (PATCH)
  const patchRes = await fetch(`${baseUrl}/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done' })
  });
  assert.equal(patchRes.status, 200);
  const patched = await patchRes.json();
  assert.equal(patched.status, 'done');

  // 5. Delete
  const delRes = await fetch(`${baseUrl}/api/tasks/${taskId}`, { method: 'DELETE' });
  assert.equal(delRes.status, 204);

  // 6. Verify deleted
  const getAfterDel = await fetch(`${baseUrl}/api/tasks/${taskId}`);
  assert.equal(getAfterDel.status, 404);
});

test('POST /api/tasks with invalid body returns 400', async () => {
  const res = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '' })
  });
  assert.equal(res.status, 400);
});

test('GET /api/nonexistent returns 404 with standard error format', async () => {
  const res = await fetch(`${baseUrl}/api/nonexistent`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.ok(data.error);
  assert.equal(data.error.status, 404);
});
