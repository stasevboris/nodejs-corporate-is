import { Transform } from 'node:stream';

export class ParserStream extends Transform {
  constructor(options = {}) {
    super({ ...options, readableObjectMode: true, writableObjectMode: false });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString('utf-8');
    const lines = this.buffer.split('\n');
    // Последняя неполная строка остается в буфере
    this.buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        this.push(parsed);
      } catch (err) {
        // Пропускаем невалидные строки, но логируем событие
        this.emit('parse:error', { line: trimmed, error: err.message });
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
