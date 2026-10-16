import { Transform } from 'node:stream';

export class SanitizerStream extends Transform {
  constructor(auditMonitor, options = {}) {
    super({ ...options, objectMode: true });
    this.monitor = auditMonitor;
  }

  _transform(entry, encoding, callback) {
    if (this.monitor) {
      this.monitor.recordEntry(entry);
    }

    const sanitized = { ...entry };

    // 1. Маскирование IP-адресов
    if (sanitized.ip) {
      sanitized.ip = sanitized.ip.replace(/(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}/, '$1.***.***');
    }

    // 2. Маскирование Email
    if (sanitized.userEmail) {
      sanitized.userEmail = sanitized.userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    }

    // 3. Маскирование токенов и заголовков Authorization
    if (sanitized.authorization) {
      sanitized.authorization = sanitized.authorization.replace(/(Bearer\s+)(.{6}).*/i, '$1$2******');
    }

    this.push(sanitized);
    callback();
  }
}
