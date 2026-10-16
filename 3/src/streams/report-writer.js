import { Writable } from 'node:stream';
import fs from 'node:fs';

export class ReportWriter extends Writable {
  constructor(sanitizedLogPath, options = {}) {
    super({ ...options, objectMode: true });
    this.outStream = fs.createWriteStream(sanitizedLogPath, { encoding: 'utf-8' });
    this.processedCount = 0;
  }

  _write(chunk, encoding, callback) {
    this.processedCount++;
    const line = JSON.stringify(chunk) + '\n';
    if (!this.outStream.write(line)) {
      this.outStream.once('drain', callback);
    } else {
      callback();
    }
  }

  _final(callback) {
    this.outStream.end(callback);
  }
}
