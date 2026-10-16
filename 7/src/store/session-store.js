import { CryptoUtils } from '../utils/crypto.js';
import { config } from '../config.js';

export class SessionStore {
  constructor(options = {}) {
    this.sessions = new Map();
    this.idleTimeoutMs = options.idleTimeoutMs || config.idleTimeoutMs;
    this.absoluteLifetimeMs = options.absoluteLifetimeMs || config.absoluteLifetimeMs;

    // Фоновая очистка просроченных сессий
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 60 * 1000);
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  create(data = {}, fingerprint = null) {
    const id = CryptoUtils.generateSessionId();
    const now = Date.now();
    const session = {
      id,
      fingerprint,
      createdAt: now,
      lastAccessAt: now,
      data: {
        isGuest: true,
        user: null,
        preferences: { theme: 'light', lang: 'ru' },
        cart: [],
        ...data
      }
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id, currentFingerprint = null) {
    const session = this.sessions.get(id);
    if (!session) return null;

    const now = Date.now();

    // 1. Проверка absolute lifetime
    if (now - session.createdAt > this.absoluteLifetimeMs) {
      this.destroy(id);
      return null;
    }

    // 2. Проверка idle timeout
    if (now - session.lastAccessAt > this.idleTimeoutMs) {
      this.destroy(id);
      return null;
    }

    // 3. Защита от Session Hijacking по отпечатку клиента
    if (currentFingerprint && session.fingerprint && session.fingerprint !== currentFingerprint) {
      console.warn(`[SECURITY ALERT] Несовпадение отпечатка сессии! ID: ${id}`);
      this.destroy(id);
      return null;
    }

    session.lastAccessAt = now;
    return session;
  }

  update(id, data) {
    const session = this.sessions.get(id);
    if (!session) return null;
    session.data = { ...session.data, ...data };
    session.lastAccessAt = Date.now();
    return session;
  }

  regenerate(oldId, currentFingerprint = null) {
    const oldSession = this.sessions.get(oldId);
    const dataCopy = oldSession ? { ...oldSession.data } : {};
    if (oldId) {
      this.destroy(oldId);
    }
    return this.create(dataCopy, currentFingerprint);
  }

  destroy(id) {
    return this.sessions.delete(id);
  }

  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (
        now - session.createdAt > this.absoluteLifetimeMs ||
        now - session.lastAccessAt > this.idleTimeoutMs
      ) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[SessionStore GC] Удалено просроченных сессий: ${cleaned}`);
    }
  }

  close() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
}

export const sessionStore = new SessionStore();
