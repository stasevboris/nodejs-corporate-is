import { Transform } from 'node:stream';

export class SanitizerStream extends Transform {
  constructor(auditMonitor = null, options = {}) {
    super({ ...options, objectMode: true });
    this.monitor = auditMonitor;
  }

  _transform(entry, encoding, callback) {
    if (this.monitor) {
      this.monitor.recordEntry(entry);
    }

    const sanitized = { ...entry };

    // 1. IP masking (сокрытие последних октетов)
    if (sanitized.ip) {
      sanitized.ip = sanitized.ip.replace(/(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}/, '$1.***.***');
    }

    // 2. Email masking
    if (sanitized.email) {
      sanitized.email = sanitized.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    }

    // 3. Authorization Bearer token masking
    if (sanitized.authorization) {
      sanitized.authorization = sanitized.authorization.replace(/(Bearer\s+)(.{6}).*/i, '$1$2******');
    }

    this.push(sanitized);
    callback();
  }
}
