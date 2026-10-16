import crypto from 'node:crypto';
import { config } from '../config.js';

export class CryptoUtils {
  static generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  static sign(value, secret = config.sessionSecret) {
    const hmac = crypto.createHmac('sha256', secret).update(value).digest('base64url');
    return `s:${value}.${hmac}`;
  }

  static unsign(signedValue, secret = config.sessionSecret) {
    if (!signedValue || !signedValue.startsWith('s:')) {
      return null;
    }

    const dotIndex = signedValue.lastIndexOf('.');
    if (dotIndex === -1) {
      return null;
    }

    const val = signedValue.slice(2, dotIndex);
    const signature = signedValue.slice(dotIndex + 1);

    const expectedHmac = crypto.createHmac('sha256', secret).update(val).digest('base64url');

    try {
      const a = Buffer.from(signature, 'utf-8');
      const b = Buffer.from(expectedHmac, 'utf-8');
      if (a.length !== b.length) return null;
      if (crypto.timingSafeEqual(a, b)) {
        return val;
      }
    } catch {
      return null;
    }
    return null;
  }

  static generateFingerprint(req) {
    const ip = req.ip || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    return crypto.createHash('sha256').update(`${ip}::${ua}`).digest('hex');
  }
}
