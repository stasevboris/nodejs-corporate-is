import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { AuditMonitor } from './emitter/audit-monitor.js';
import { ParserStream } from './streams/parser-stream.js';
import { SanitizerStream } from './streams/sanitizer-stream.js';
import { ReportWriter } from './streams/report-writer.js';
import { generateSampleLogs } from './utils/log-generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runPipeline() {
  const rawLogPath = path.resolve(__dirname, '../data/server-access.log');
  const sanitizedLogPath = path.resolve(__dirname, '../data/sanitized-access.log');
  const reportPath = path.resolve(__dirname, '../data/audit-report.json');

  console.log('--- Генерация исходного датасета логов ---');
  generateSampleLogs(rawLogPath, 300);

  const monitor = new AuditMonitor({ alertThreshold: 4, errorThreshold: 6 });

  monitor.on('security:alert', (alert) => {
    console.warn(`[SECURITY ALERT] [${alert.threats.join(', ')}] IP: ${alert.ip} -> ${alert.payloadSnippet}`);
  });

  monitor.on('threshold:exceeded', (event) => {
    console.error(`[THRESHOLD EXCEEDED] ${event.type}: ${event.message}`);
  });

  monitor.on('pipeline:complete', (stats) => {
    console.log('\n--- Итоговый отчет обработки потоков ---');
    console.log(JSON.stringify(stats, null, 2));
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2), 'utf-8');
  });

  const readStream = fs.createReadStream(rawLogPath, { highWaterMark: 16 * 1024 });
  const parser = new ParserStream({ highWaterMark: 32 });
  const sanitizer = new SanitizerStream(monitor, { highWaterMark: 32 });
  const writer = new ReportWriter(sanitizedLogPath);

  console.log('Запуск потокового конвейера (stream pipeline)...');
  await pipeline(readStream, parser, sanitizer, writer);

  monitor.finish();
  console.log(`Потоковая обработка завершена. Результаты сохранены в:\n - ${sanitizedLogPath}\n - ${reportPath}`);
}

runPipeline().catch((err) => {
  console.error('Ошибка потокового конвейера:', err);
  process.exit(1);
});
