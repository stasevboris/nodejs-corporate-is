import { spawn } from 'node:child_process';
import process from 'node:process';

export function runProcess(commandStr, timeoutMs = 0) {
  return new Promise((resolve) => {
    if (!commandStr) {
      return resolve({ code: 1, output: 'Команда не указана', timedOut: false });
    }

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArgs = isWindows ? ['/d', '/s', '/c', commandStr] : ['-c', commandStr];

    const child = spawn(shell, shellArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let timedOut = false;
    let timer = null;

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) child.kill('SIGKILL');
        }, 1500);
      }, timeoutMs);
    }

    child.stdout.on('data', c => { output += c.toString(); });
    child.stderr.on('data', c => { output += c.toString(); });

    child.on('error', err => {
      if (timer) clearTimeout(timer);
      resolve({ code: 1, output: err.message, timedOut: false });
    });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        code: timedOut ? 124 : (code ?? 0),
        output: output.trim(),
        timedOut
      });
    });
  });
}
