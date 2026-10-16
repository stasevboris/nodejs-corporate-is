import os from 'node:os';
import process from 'node:process';
import utils from './utils.cjs';

const { formatBytes, formatUptime, getPlatformString } = utils;

export function collectSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    nodeVersion: process.version,
    platform: getPlatformString(),
    cpuCount: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    memory: {
      total: formatBytes(totalMem),
      free: formatBytes(freeMem),
      used: formatBytes(usedMem),
      usagePercent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
    },
    uptime: {
      system: formatUptime(os.uptime()),
      process: formatUptime(process.uptime())
    },
    pid: process.pid
  };
}

if (process.argv[1] && process.argv[1].endsWith('system-info.js')) {
  console.log(JSON.stringify(collectSystemInfo(), null, 2));
}
