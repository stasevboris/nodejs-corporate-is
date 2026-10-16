import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { db } from '../db/in-memory-db.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class TokenService {
  static generateAccessToken(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    };
    return jwt.sign(payload, config.accessTokenSecret, { expiresIn: config.accessTokenTtl });
  }

  static generateRefreshTokenString() {
    return crypto.randomBytes(48).toString('hex');
  }

  static hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  static async issueTokenPair(user, existingFamilyId = null) {
    const accessToken = this.generateAccessToken(user);
    const rawRefreshToken = this.generateRefreshTokenString();
    const tokenHash = this.hashToken(rawRefreshToken);

    const familyId = existingFamilyId || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000).toISOString();

    const tokenRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      familyId,
      isRevoked: false,
      expiresAt,
      createdAt: new Date().toISOString()
    };

    db.refreshTokens.set(tokenRecord.id, tokenRecord);

    return {
      accessToken,
      refreshToken: `${tokenRecord.id}:${rawRefreshToken}`,
      expiresIn: config.accessTokenTtl
    };
  }

  static async rotateRefreshToken(combinedToken) {
    if (!combinedToken || !combinedToken.includes(':')) {
      throw new UnauthorizedError('Некорректный формат refresh token');
    }

    const [tokenId, rawSecret] = combinedToken.split(':');
    const tokenRecord = db.refreshTokens.get(tokenId);

    if (!tokenRecord) {
      throw new UnauthorizedError('Refresh token не найден в системе');
    }

    const incomingHash = this.hashToken(rawSecret);

    // Детекция повторного использования (Reuse Detection):
    // Если токен уже отозван или хеш не совпадает — компрометация цепочки!
    if (tokenRecord.isRevoked || tokenRecord.tokenHash !== incomingHash) {
      console.warn(`[SECURITY ALERT] Обнаружена попытка повторного использования отозванного токена (Reuse Attack)! FamilyId: ${tokenRecord.familyId}`);
      // Отзываем ВСЕ токены данного семейства
      for (const [id, rec] of db.refreshTokens.entries()) {
        if (rec.familyId === tokenRecord.familyId) {
          rec.isRevoked = true;
        }
      }
      db.logAudit(tokenRecord.userId, 'TOKEN_REUSE_DETECTED', 'auth', {
        compromisedFamilyId: tokenRecord.familyId
      });
      throw new UnauthorizedError('Компрометация токена: сессия отозвана из соображений безопасности. Войдите заново.');
    }

    // Проверка срока действия
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      tokenRecord.isRevoked = true;
      throw new UnauthorizedError('Срок действия refresh token истек');
    }

    // Отзываем использованный токен (RTR)
    tokenRecord.isRevoked = true;

    const user = db.users.get(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Пользователь заблокирован или не существует');
    }

    // Выпускаем новую пару в том же familyId
    return this.issueTokenPair(user, tokenRecord.familyId);
  }

  static revokeToken(combinedToken) {
    if (!combinedToken || !combinedToken.includes(':')) return;
    const [tokenId] = combinedToken.split(':');
    const tokenRecord = db.refreshTokens.get(tokenId);
    if (tokenRecord) {
      tokenRecord.isRevoked = true;
    }
  }

  static revokeAllForUser(userId) {
    for (const [id, rec] of db.refreshTokens.entries()) {
      if (rec.userId === userId) {
        rec.isRevoked = true;
      }
    }
    db.logAudit(userId, 'LOGOUT_ALL_SESSIONS', 'auth');
  }
}
