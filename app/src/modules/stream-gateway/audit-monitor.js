import { EventEmitter } from 'node:events';

export class AuditMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.alertThreshold = options.alertThreshold || 3;
    this.stats = {
      totalProcessed: 0,
      alertsCount: 0,
      errorsCount: 0,
      threatsDetected: []
    };
  }

  recordEntry(entry) {
    this.stats.totalProcessed++;
    const status = entry.statusCode || 200;
    if (status >= 500) {
      this.stats.errorsCount++;
    }

    const payload = `${entry.url || ''} ${entry.userAgent || ''} ${entry.body || ''} ${entry.query || ''}`;
    const threats = [];

    const sqlPattern = /(?:'|%27)?\s*(?:OR|AND)\s+(?:'?[0-9a-z]+'?\s*=\s*'?[0-9a-z]+'?|true)/i;
    const xssPattern = /<script\b[^>]*>([\s\S]*?)<\/script>|javascript:/i;
    const traversalPattern = /(?:\.\.\/|\.\.\\)/;

    if (sqlPattern.test(payload)) threats.push('SQL_INJECTION');
    if (xssPattern.test(payload)) threats.push('XSS_ATTACK');
    if (traversalPattern.test(payload)) threats.push('PATH_TRAVERSAL');

    if (threats.length > 0) {
      this.stats.alertsCount += threats.length;
      const alertObj = {
        id: entry.id || Date.now(),
        ip: entry.ip,
        timestamp: entry.timestamp || new Date().toISOString(),
        threats,
        snippet: payload.slice(0, 80)
      };
      this.stats.threatsDetected.push(alertObj);
      this.emit('security:alert', alertObj);

      if (this.stats.alertsCount >= this.alertThreshold) {
        this.emit('threshold:exceeded', {
          count: this.stats.alertsCount,
          threshold: this.alertThreshold
        });
      }
    }

    this.emit('entry:processed', { total: this.stats.totalProcessed });
  }

  getSummary() {
    return { ...this.stats };
  }
}
