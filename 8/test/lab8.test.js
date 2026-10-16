import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { db } from '../src/db/in-memory-db.js';

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

test('POST /api/v1/auth/register creates user and rejects duplicate email', async () => {
  const email = `test_${Date.now()}@test.org`;
  const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'SecurePassword123!', role: 'USER' })
  });
  assert.equal(regRes.status, 201);
  const data = await regRes.json();
  assert.equal(data.user.email, email);

  // Duplicate rejection
  const dupRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'SecurePassword123!' })
  });
  assert.equal(dupRes.status, 400);
});

test('POST /api/v1/auth/login returns accessToken and refreshToken', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@stefan-lab.org', password: 'Password123!' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.accessToken);
  assert.ok(data.refreshToken);
  assert.equal(data.user.role, 'USER');
});

test('RTR Refresh Token Rotation and Reuse Detection', async () => {
  // 1. Login
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@stefan-lab.org', password: 'Password123!' })
  });
  const { refreshToken: token1 } = await loginRes.json();

  // 2. First Refresh (Normal rotation)
  const refRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token1 })
  });
  assert.equal(refRes.status, 200);
  const { refreshToken: token2 } = await refRes.json();
  assert.notEqual(token1, token2);

  // 3. Reuse Attack: Re-presenting token1 (which is already revoked!)
  const attackRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token1 })
  });
  assert.equal(attackRes.status, 401);
  const attackData = await attackRes.json();
  assert.match(attackData.error.message, /Компрометация токена/);

  // 4. Token2 must now also be revoked due to whole family invalidation!
  const token2Res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token2 })
  });
  assert.equal(token2Res.status, 401);
});

test('RBAC: USER role cannot view CONFIDENTIAL documents or access /users', async () => {
  // Login as USER
  const userRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@stefan-lab.org', password: 'Password123!' })
  });
  const { accessToken } = await userRes.json();

  // Try to access CONFIDENTIAL doc
  const docRes = await fetch(`${baseUrl}/api/v1/documents/doc-confidential-1`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  assert.equal(docRes.status, 403);

  // Try to access ADMIN /users
  const adminRes = await fetch(`${baseUrl}/api/v1/users`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  assert.equal(adminRes.status, 403);
});

test('ABAC & Ownership: USER cannot delete other user document, but ADMIN can', async () => {
  // 1. User login
  const uLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@stefan-lab.org', password: 'Password123!' })
  });
  const { accessToken: uToken } = await uLogin.json();

  // User attempts to delete document owned by Manager
  const delForbidden = await fetch(`${baseUrl}/api/v1/documents/doc-internal-1`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${uToken}` }
  });
  assert.equal(delForbidden.status, 403);

  // 2. Admin login
  const aLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@stefan-lab.org', password: 'Password123!' })
  });
  const { accessToken: aToken } = await aLogin.json();

  // Admin deletes document
  const delAllowed = await fetch(`${baseUrl}/api/v1/documents/doc-internal-1`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${aToken}` }
  });
  assert.equal(delAllowed.status, 204);
});
