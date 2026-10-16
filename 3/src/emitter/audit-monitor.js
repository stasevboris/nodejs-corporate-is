import { EventEmitter } from 'node:events';

export class AuditMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.alertThreshold = options.alertThreshold || 5;
    this.errorThreshold = options.errorThreshold || 10;
    this.stats = {
      totalProcessed: 0,
      alertsCount: 0,
      errorsCount: 0,
      sanitizedCount: 0,
      statusCodes: {}
    };
  }

  recordEntry(entry) {
    this.stats.totalProcessed++;
    const status = entry.statusCode || 200;
    this.stats.statusCodes[status] = (this.stats.statusCodes[status] || 0) + 1;

    if (status >= 500) {
      this.stats.errorsCount++;
      if (this.stats.errorsCount === this.errorThreshold) {
        this.emit('threshold:exceeded', {
          type: 'ERRORS_THRESHOLD',
          count: this.stats.errorsCount,
          message: `Число серверных ошибок (5xx) достигло ${this.errorThreshold}`
        });
      }
    }

    // Детекция угроз безопасности
    const payload = `${entry.url || ''} ${entry.userAgent || ''} ${entry.body || ''}`;
    const threats = [];

    const sqlPattern = /(?:'|%27)?\s*(?:OR|AND)\s+(?:'?[0-9a-z]+'?\s*=\s*'?[0-9a-z]+'?|true)/i;
    const xssPattern = /<script\b[^>]*>([\s\S]*?)<\/script>|javascript:/i;
    const traversalPattern = /(?:\.\.\/|\.\.\\)/;

    if (sqlPattern.test(payload)) {
      threats.push('SQL_INJECTION');
    }
    if (xssPattern.test(payload)) {
      threats.push('XSS_ATTACK');
    }
    if (traversalPattern.test(payload)) {
      threats.push('PATH_TRAVERSAL');
    }

    if (threats.length > 0) {
      this.stats.alertsCount += threats.length;
      this.emit('security:alert', {
        id: entry.id,
        ip: entry.ip,
        timestamp: entry.timestamp,
        threats,
        payloadSnippet: payload.slice(0, 100)
      });

      if (this.stats.alertsCount === this.alertThreshold) {
        this.emit('threshold:exceeded', {
          type: 'SECURITY_ALERTS_THRESHOLD',
          count: this.stats.alertsCount,
          message: `Число инцидентов безопасности достигло порога: ${this.alertThreshold}`
        });
      }
    }

    this.emit('entry:processed', {
      id: entry.id,
      total: this.stats.totalProcessed
    });
  }

  finish() {
    this.emit('pipeline:complete', {
      timestamp: new Date().toISOString(),
      summary: this.stats
    });
  }
}
