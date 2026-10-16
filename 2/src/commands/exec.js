import { spawn } from 'node:child_process';
import { logger } from '../utils/logger.js';

export async function handleExec(commandStr, timeoutMs = 0) {
  if (!commandStr) {
    logger.error('Команда для выполнения не указана. Используйте --cmd "<команда>"');
    return 1;
  }

  logger.info(`Запуск команды: "${commandStr}" (таймаут: ${timeoutMs > 0 ? timeoutMs + 'ms' : 'нет'})`);

  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/d', '/s', '/c', commandStr] : ['-c', commandStr];

    const child = spawn(shell, shellArgs, {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let timedOut = false;
    let timer = null;

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        logger.warn(`Таймаут команды превышен (${timeoutMs}ms). Отправка SIGTERM...`);
        child.kill('SIGTERM');

        setTimeout(() => {
          if (!child.killed) {
            logger.error('Процесс не завершился по SIGTERM. Отправка SIGKILL...');
            child.kill('SIGKILL');
          }
        }, 1500);
      }, timeoutMs);
    }

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      logger.error(`Ошибка запуска процесса: ${err.message}`);
      resolve(1);
    });

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        logger.error(`Процесс был принудительно остановлен по таймауту.`);
        resolve(124);
      } else if (signal) {
        logger.warn(`Процесс завершен сигналом: ${signal}`);
        resolve(128);
      } else {
        if (code === 0) {
          logger.success(`Команда выполнена успешно (код: 0)`);
        } else {
          logger.error(`Команда завершилась с ошибкой (код: ${code})`);
        }
        resolve(code ?? 0);
      }
    });
  });
}
