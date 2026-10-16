import crypto from 'node:crypto';
import { config } from '../../config/env.js';

export class SessionStore {
  constructor(options = {}) {
    this.sessions = new Map();
    this.idleTimeoutMs = options.idleTimeoutMs || config.idleTimeoutMs;
    this.absoluteLifetimeMs = options.absoluteLifetimeMs || config.absoluteLifetimeMs;
  }

  create(data = {}, fingerprint = null) {
    const id = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const session = {
      id,
      fingerprint,
      createdAt: now,
      lastAccessAt: now,
      data: { isGuest: true, user: null, ...data }
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id, currentFingerprint = null) {
    const session = this.sessions.get(id);
    if (!session) return null;

    const now = Date.now();
    if (now - session.createdAt > this.absoluteLifetimeMs || now - session.lastAccessAt > this.idleTimeoutMs) {
      this.sessions.delete(id);
      return null;
    }

    if (currentFingerprint && session.fingerprint && session.fingerprint !== currentFingerprint) {
      console.warn(`[SECURITY] Попытка перехвата сессии (Fingerprint mismatch)! ID: ${id}`);
      this.sessions.delete(id);
      return null;
    }

    session.lastAccessAt = now;
    return session;
  }

  update(id, data) {
    const s = this.sessions.get(id);
    if (!s) return null;
    s.data = { ...s.data, ...data };
    s.lastAccessAt = Date.now();
    return s;
  }

  destroy(id) {
    return this.sessions.delete(id);
  }
}

export const sessionStore = new SessionStore();
