import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { logger } from '../utils/logger.js';

export async function handleClean(targetDir, options = {}) {
  const { dryRun = false, force = false } = options;

  if (!targetDir) {
    logger.error('Целевой каталог для очистки не указан.');
    return 1;
  }

  const resolvedPath = path.resolve(process.cwd(), targetDir);

  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isDirectory()) {
      logger.error(`Путь ${resolvedPath} не является каталогом.`);
      return 1;
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.error(`Каталог не существует: ${resolvedPath}`);
    } else {
      logger.error(`Ошибка доступа: ${err.message}`);
    }
    return 1;
  }

  const files = await fs.readdir(resolvedPath);
  if (files.length === 0) {
    logger.info(`Каталог ${resolvedPath} уже пуст.`);
    return 0;
  }

  logger.info(`Найдено объектов для очистки в ${resolvedPath}: ${files.length}`);
  for (const file of files) {
    logger.dim(`- ${file}`);
  }

  if (dryRun) {
    logger.warn('[DRY-RUN] Режим симуляции. Никакие файлы не были удалены.');
    return 0;
  }

  if (!force) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((res) => {
      rl.question(`Удалить все объекты (${files.length})? [y/N]: `, (ans) => {
        rl.close();
        res(ans.trim().toLowerCase());
      });
    });

    if (answer !== 'y' && answer !== 'yes') {
      logger.warn('Очистка отменена пользователем.');
      return 0;
    }
  }

  for (const file of files) {
    const itemPath = path.join(resolvedPath, file);
    await fs.rm(itemPath, { recursive: true, force: true });
    logger.success(`Удалено: ${file}`);
  }

  logger.success('Очистка завершена.');
  return 0;
}
