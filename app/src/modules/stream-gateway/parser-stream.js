import { Transform } from 'node:stream';

export class ParserStream extends Transform {
  constructor(options = {}) {
    super({ ...options, readableObjectMode: true, writableObjectMode: false });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString('utf-8');
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // неполная строка в буфер

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        this.push(parsed);
      } catch (err) {
        this.emit('parse:error', { line, error: err.message });
      }
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer && this.buffer.trim()) {
      try {
        const parsed = JSON.parse(this.buffer.trim());
        this.push(parsed);
      } catch (err) {
        this.emit('parse:error', { line: this.buffer, error: err.message });
      }
    }
    this.buffer = '';
    callback();
  }
}
