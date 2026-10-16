import crypto from 'node:crypto';
import { config } from '../../config/env.js';

export class CryptoUtils {
  static sign(value, secret = config.sessionSecret) {
    const hmac = crypto.createHmac('sha256', secret).update(value).digest('base64url');
    return `s:${value}.${hmac}`;
  }

  static unsign(signedValue, secret = config.sessionSecret) {
    if (!signedValue || !signedValue.startsWith('s:')) return null;
    const dotIdx = signedValue.lastIndexOf('.');
    if (dotIdx === -1) return null;

    const val = signedValue.slice(2, dotIdx);
    const signature = signedValue.slice(dotIdx + 1);
    const expected = crypto.createHmac('sha256', secret).update(val).digest('base64url');

    try {
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length !== b.length) return null;
      if (crypto.timingSafeEqual(a, b)) return val;
    } catch {
      return null;
    }
    return null;
  }

  static generateFingerprint(req) {
    const ip = req.ip || req.socket?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    return crypto.createHash('sha256').update(`${ip}::${ua}`).digest('hex');
  }
}
