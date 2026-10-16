import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

function loadDotEnv(envFilePath) {
  if (fs.existsSync(envFilePath)) {
    const content = fs.readFileSync(envFilePath, 'utf-8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadDotEnv(path.join(rootDir, '.env'));

export const config = {
  appName: process.env.APP_NAME || 'EnterpriseSystem',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'enterprise_super_secret_jwt_key_2026',
  sessionSecret: process.env.SESSION_SECRET || 'enterprise_hmac_session_secret_key_2026',
  dbPath: process.env.DB_PATH || path.join(rootDir, 'data/enterprise.db'),
  idleTimeoutMs: 15 * 60 * 1000, // 15 mins
  absoluteLifetimeMs: 24 * 60 * 60 * 1000, // 24 hours
  cookieName: 'enterprise_sid',
  accessTokenTtl: '15m',
  refreshTokenTtlDays: 7,
  pingIntervalMs: 15000,
  rootDir
};
