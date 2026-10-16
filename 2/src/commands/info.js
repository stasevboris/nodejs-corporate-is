import os from 'node:os';
import process from 'node:process';
import { logger } from '../utils/logger.js';

export async function handleInfo() {
  const cpus = os.cpus();
  const totalMem = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
  const freeMem = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
  const usedMem = (totalMem - freeMem).toFixed(2);

  logger.info('--- Системная конфигурация ---');
  logger.dim(`ОС: ${os.type()} ${os.release()} (${os.arch()})`);
  logger.dim(`Хост: ${os.hostname()}`);
  logger.dim(`Процессор: ${cpus[0]?.model} x ${cpus.length} cores`);
  logger.dim(`Память: Использовано ${usedMem} GB / Всего ${totalMem} GB`);
  logger.dim(`Node.js: ${process.version}`);
  logger.dim(`PID: ${process.pid}`);
  logger.dim(`Аптайм системы: ${(os.uptime() / 3600).toFixed(1)} часов`);
  return 0;
}
