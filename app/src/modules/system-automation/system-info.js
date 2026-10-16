import os from 'node:os';
import process from 'node:process';

// Динамический импорт CJS-модуля из ESM
const utilsModule = await import('./utils.cjs');
const { formatBytes, formatUptime, getPlatformString } = utilsModule.default || utilsModule;

export function collectSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    nodeVersion: process.version,
    platform: getPlatformString(),
    hostname: os.hostname(),
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Generic CPU',
    memory: {
      total: formatBytes(totalMem),
      free: formatBytes(freeMem),
      used: formatBytes(usedMem),
      usagePercent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
    },
    processMemory: {
      heapUsed: formatBytes(process.memoryUsage().heapUsed),
      heapTotal: formatBytes(process.memoryUsage().heapTotal),
      rss: formatBytes(process.memoryUsage().rss)
    },
    uptime: {
      system: formatUptime(os.uptime()),
      process: formatUptime(process.uptime())
    },
    pid: process.pid
  };
}
