import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../../config/env.js';

// In-memory store для демонстрации RTR и Reuse Detection
export const dbTokens = new Map();
export const dbUsers = new Map([
  ['usr-1', { id: 'usr-1', username: 'admin', role: 'ADMIN', email: 'admin@enterprise.local' }],
  ['usr-2', { id: 'usr-2', username: 'manager', role: 'MANAGER', email: 'manager@enterprise.local' }],
  ['usr-3', { id: 'usr-3', username: 'employee', role: 'USER', email: 'user@enterprise.local' }]
]);

export class TokenService {
  static generateAccessToken(user) {
    return jwt.sign(
      { sub: user.id, username: user.username, role: user.role, email: user.email },
      config.jwtSecret,
      { expiresIn: config.accessTokenTtl }
    );
  }

  static hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  static issueTokenPair(user, existingFamilyId = null) {
    const accessToken = this.generateAccessToken(user);
    const rawRefresh = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const familyId = existingFamilyId || crypto.randomUUID();
    const tokenId = crypto.randomUUID();

    const record = {
      id: tokenId,
      userId: user.id,
      tokenHash,
      familyId,
      isRevoked: false,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000
    };
    dbTokens.set(tokenId, record);

    return {
      accessToken,
      refreshToken: `${tokenId}:${rawRefresh}`,
      familyId,
      expiresIn: config.accessTokenTtl
    };
  }

  static rotateRefreshToken(combinedToken) {
    if (!combinedToken || !combinedToken.includes(':')) {
      throw new Error('Некорректный формат refresh token');
    }
    const [tokenId, rawSecret] = combinedToken.split(':');
    const record = dbTokens.get(tokenId);
    if (!record) {
      throw new Error('Refresh token не найден в системе');
    }

    const incomingHash = this.hashToken(rawSecret);

    // Reuse Detection: если токен уже отозван или хэш не сошёлся — компрометация!
    if (record.isRevoked || record.tokenHash !== incomingHash) {
      console.warn(`[SECURITY ALERT] Детекция повторного использования токена (Reuse Attack)! Семейство: ${record.familyId}`);
      for (const rec of dbTokens.values()) {
        if (rec.familyId === record.familyId) {
          rec.isRevoked = true;
        }
      }
      throw new Error('Компрометация токена: вся цепочка сессий отозвана.');
    }

    if (Date.now() > record.expiresAt) {
      record.isRevoked = true;
      throw new Error('Срок действия refresh token истек');
    }

    // Отзываем старый токен (RTR)
    record.isRevoked = true;

    const user = dbUsers.get(record.userId);
    if (!user) throw new Error('Пользователь не найден');

    return this.issueTokenPair(user, record.familyId);
  }
}
