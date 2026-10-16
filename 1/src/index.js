import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { collectSystemInfo } from './system-info.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log(`[${config.APP_NAME}] Запуск диагностического приложения`);
console.log(`Окружение: ${config.NODE_ENV} | Порт: ${config.PORT}`);
console.log(`Метаданные модуля:`);
console.log(` - import.meta.url: ${import.meta.url}`);
console.log(` - __dirname (вычислено): ${__dirname}`);
console.log('='.repeat(60));

// Динамический импорт CommonJS утилит через import()
const utilsModule = await import('./utils.cjs');
const { formatBytes, getPlatformString } = utilsModule.default || utilsModule;

console.log(`Платформа (из CJS утилит): ${getPlatformString()}`);
console.log(`Объем кучи V8: ${formatBytes(process.memoryUsage().heapUsed)}`);

const sysInfo = collectSystemInfo();
console.log('\n--- Системные характеристики ---');
console.log(`Версия Node: ${sysInfo.nodeVersion}`);
console.log(`Процессор: ${sysInfo.cpuModel} (${sysInfo.cpuCount} ядер)`);
console.log(`Память: Занято ${sysInfo.memory.used} из ${sysInfo.memory.total} (${sysInfo.memory.usagePercent})`);
console.log(`Аптайм процесса: ${sysInfo.uptime.process}`);
console.log('='.repeat(60));
