import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export class Database {
  constructor() {
    this.users = new Map();
    this.refreshTokens = new Map();
    this.documents = new Map();
    this.auditLogs = [];
    this.seed();
  }

  seed() {
    const adminId = '11111111-1111-4111-8111-111111111111';
    const managerId = '22222222-2222-4222-8222-222222222222';
    const userId = '33333333-3333-4333-8333-333333333333';

    const hash = bcrypt.hashSync('Password123!', 8);

    this.users.set(adminId, {
      id: adminId,
      email: 'admin@stefan-lab.org',
      passwordHash: hash,
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    this.users.set(managerId, {
      id: managerId,
      email: 'manager@stefan-lab.org',
      passwordHash: hash,
      role: 'MANAGER',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    this.users.set(userId, {
      id: userId,
      email: 'user@stefan-lab.org',
      passwordHash: hash,
      role: 'USER',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    // Документы
    this.documents.set('doc-public-1', {
      id: 'doc-public-1',
      title: 'Публичные стандарты кодирования',
      content: 'Все разработчики обязаны писать чистый код.',
      classification: 'PUBLIC',
      ownerId: userId,
      createdAt: new Date().toISOString()
    });

    this.documents.set('doc-internal-1', {
      id: 'doc-internal-1',
      title: 'Внутренний регламент отпусков',
      content: 'График отпусков утверждается за 2 недели.',
      classification: 'INTERNAL',
      ownerId: managerId,
      createdAt: new Date().toISOString()
    });

    this.documents.set('doc-confidential-1', {
      id: 'doc-confidential-1',
      title: 'Финансовый отчет Q4 и бюджет поглощения',
      content: 'Конфиденциально: бюджет сделки 50M USD.',
      classification: 'CONFIDENTIAL',
      ownerId: adminId,
      createdAt: new Date().toISOString()
    });
  }

  logAudit(userId, action, resource, details = {}) {
    const entry = {
      id: crypto.randomUUID(),
      userId,
      action,
      resource,
      details,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.push(entry);
    return entry;
  }
}

export const db = new Database();
