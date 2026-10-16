import fs from 'node:fs/promises';
import path from 'node:path';
import { handleExec } from './exec.js';
import { logger } from '../utils/logger.js';

export async function handlePipeline(configFilePath, mode = 'series') {
  if (!configFilePath) {
    logger.error('Путь к файлу конфигурации конвейера не указан.');
    return 1;
  }

  const resolvedConfig = path.resolve(process.cwd(), configFilePath);
  let config;
  try {
    const raw = await fs.readFile(resolvedConfig, 'utf-8');
    config = JSON.parse(raw);
  } catch (err) {
    logger.error(`Не удалось прочитать конфигурацию ${resolvedConfig}: ${err.message}`);
    return 1;
  }

  const tasks = config.tasks || [];
  if (!Array.isArray(tasks) || tasks.length === 0) {
    logger.warn('Конвейер не содержит задач.');
    return 0;
  }

  logger.info(`Запуск конвейера "${config.name || 'unnamed'}" в режиме [${mode}], задач: ${tasks.length}`);

  if (mode === 'parallel') {
    logger.info('Конкурентный запуск задач...');
    const results = await Promise.all(
      tasks.map(async (t) => {
        logger.info(`[START] ${t.name}: ${t.command}`);
        const code = await handleExec(t.command, t.timeout || 0);
        return { name: t.name, code };
      })
    );

    let hasErrors = false;
    for (const r of results) {
      if (r.code !== 0) {
        logger.error(`Задача ${r.name} завершилась с ошибкой (код: ${r.code})`);
        hasErrors = true;
      }
    }
    return hasErrors ? 1 : 0;
  } else {
    // Последовательный запуск
    for (const t of tasks) {
      logger.info(`[STEP] ${t.name}: ${t.command}`);
      const code = await handleExec(t.command, t.timeout || 0);
      if (code !== 0) {
        logger.error(`Конвейер остановлен на задаче "${t.name}" (код ${code})`);
        return code;
      }
    }
    logger.success('Все задачи конвейера успешно выполнены!');
    return 0;
  }
}
