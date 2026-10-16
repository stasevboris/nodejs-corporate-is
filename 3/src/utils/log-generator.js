import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function generateSampleLogs(outputPath, count = 200) {
  const file = outputPath || path.resolve(__dirname, '../../data/server-access.log');
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const routes = [
    '/api/v1/users',
    '/api/v1/login',
    '/api/v1/products?cat=books',
    '/api/v1/items/search?q=test',
    '/api/v1/admin/debug?file=../../etc/passwd', // Path traversal
    "/api/v1/users?id=1' OR '1'='1", // SQL injection
    '/public/upload?title=<script>alert(1)</script>' // XSS
  ];

  const lines = [];
  for (let i = 1; i <= count; i++) {
    const isError = i % 20 === 0;

    let route = routes[i % routes.length];
    let status = isError ? 500 : (i % 7 === 0 ? 404 : 200);

    const logEntry = {
      id: `req-${i}`,
      timestamp: new Date(Date.now() - (count - i) * 1000).toISOString(),
      method: methods[i % methods.length],
      url: route,
      statusCode: status,
      ip: `192.168.${Math.floor(i / 50)}.${i % 250}`,
      userEmail: `operator_${i}@corporate-domain.com`,
      authorization: `Bearer sec_token_alphanumeric_${i}_xyz987`,
      responseTimeMs: Math.floor(Math.random() * 120) + 5
    };

    lines.push(JSON.stringify(logEntry));
  }

  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
  return file;
}

if (process.argv[1] && process.argv[1].endsWith('log-generator.js')) {
  const p = generateSampleLogs();
  console.log(`Тестовый файл логов сгенерирован: ${p}`);
}
