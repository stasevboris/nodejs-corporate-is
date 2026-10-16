import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnv(envPath) {
  const targetPath = envPath || path.resolve(__dirname, '../.env');
  const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 3000,
    APP_NAME: process.env.APP_NAME || 'NodeApp',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  };

  if (fs.existsSync(targetPath)) {
    const content = fs.readFileSync(targetPath, 'utf-8');
    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;
      const key = line.slice(0, eqIndex).trim();
      const val = line.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
      if (key === 'PORT') config.PORT = parseInt(val, 10);
      else config[key] = val;
    }
  }

  return config;
}

export const config = loadEnv();
