import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

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

test('GET /api/v1/articles returns HATEOAS links and Link header', async () => {
  const res = await fetch(`${baseUrl}/api/v1/articles`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('link'));
  const data = await res.json();
  assert.ok(data._links);
  assert.ok(Array.isArray(data.items));
});

test('POST /api/v1/articles validates Zod schema and sets 201 + Location + ETag', async () => {
  const invalidRes = await fetch(`${baseUrl}/api/v1/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'A' }) // too short
  });
  assert.equal(invalidRes.status, 400);
  assert.match(invalidRes.headers.get('content-type'), /application\/problem\+json/);
  const errData = await invalidRes.json();
  assert.equal(errData.title, 'Validation Error');

  const validRes = await fetch(`${baseUrl}/api/v1/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Архитектура веб-сервисов на Zod',
      content: 'Подробное описание схемы валидации данных и контракта REST.',
      author: 'Stefan Engineer',
      status: 'published',
      tags: ['zod', 'api']
    })
  });
  assert.equal(validRes.status, 201);
  assert.ok(validRes.headers.get('location'));
  assert.ok(validRes.headers.get('etag'));
});

test('ETag conditional GET returns 304 Not Modified', async () => {
  const seedId = 'e1a2b3c4-1111-4000-8000-000000000001';

  // 1. Initial GET
  const getRes = await fetch(`${baseUrl}/api/v1/articles/${seedId}`);
  assert.equal(getRes.status, 200);
  const etag = getRes.headers.get('etag');
  assert.ok(etag);

  // 2. Conditional GET with If-None-Match matching etag
  const condRes = await fetch(`${baseUrl}/api/v1/articles/${seedId}`, {
    headers: { 'If-None-Match': etag }
  });
  assert.equal(condRes.status, 304);
});

test('PUT Lost Update Defense: requires If-Match and rejects stale ETag with 412', async () => {
  const seedId = 'e1a2b3c4-1111-4000-8000-000000000001';

  // 1. PUT without If-Match returns 428 Precondition Required
  const noIfMatch = await fetch(`${baseUrl}/api/v1/articles/${seedId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Новый заголовок статьи',
      content: 'Обновленное содержание статьи полностью.',
      author: 'Stefan Engineer',
      status: 'published',
      tags: ['rest']
    })
  });
  assert.equal(noIfMatch.status, 428);

  // 2. PUT with outdated ETag returns 412 Precondition Failed
  const staleIfMatch = await fetch(`${baseUrl}/api/v1/articles/${seedId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': 'W/"99-wronghash"'
    },
    body: JSON.stringify({
      title: 'Новый заголовок статьи',
      content: 'Обновленное содержание статьи полностью.',
      author: 'Stefan Engineer',
      status: 'published',
      tags: ['rest']
    })
  });
  assert.equal(staleIfMatch.status, 412);
  const probData = await staleIfMatch.json();
  assert.equal(probData.title, 'Precondition Failed');

  // 3. PUT with valid current ETag succeeds (200) and increments version
  const getRes = await fetch(`${baseUrl}/api/v1/articles/${seedId}`);
  const validETag = getRes.headers.get('etag');

  const updateSuccess = await fetch(`${baseUrl}/api/v1/articles/${seedId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': validETag
    },
    body: JSON.stringify({
      title: 'Новый заголовок статьи',
      content: 'Обновленное содержание статьи полностью.',
      author: 'Stefan Engineer',
      status: 'published',
      tags: ['rest']
    })
  });
  assert.equal(updateSuccess.status, 200);
  const updated = await updateSuccess.json();
  assert.equal(updated.version, 2);
});

test('Sub-resource Comments: list, create, delete', async () => {
  const seedId = 'e1a2b3c4-1111-4000-8000-000000000001';

  // Create comment
  const createRes = await fetch(`${baseUrl}/api/v1/articles/${seedId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'Maria Tester', text: 'Очень полезная статья!' })
  });
  assert.equal(createRes.status, 201);
  const comment = await createRes.json();
  assert.ok(comment.id);

  // List comments
  const listRes = await fetch(`${baseUrl}/api/v1/articles/${seedId}/comments`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.items.length >= 2);

  // Delete comment
  const delRes = await fetch(`${baseUrl}/api/v1/articles/${seedId}/comments/${comment.id}`, {
    method: 'DELETE'
  });
  assert.equal(delRes.status, 204);
});
