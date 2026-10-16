import { runProcess } from './exec.js';

export async function runPipeline(tasks = [], mode = 'series') {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { success: true, mode, results: [] };
  }

  if (mode === 'parallel') {
    const results = await Promise.all(
      tasks.map(async (t) => {
        const start = Date.now();
        const res = await runProcess(t.command, t.timeout || 0);
        return { name: t.name, command: t.command, ...res, durationMs: Date.now() - start };
      })
    );
    const hasError = results.some(r => r.code !== 0);
    return { success: !hasError, mode, results };
  } else {
    const results = [];
    let hasError = false;
    for (const t of tasks) {
      const start = Date.now();
      const res = await runProcess(t.command, t.timeout || 0);
      results.push({ name: t.name, command: t.command, ...res, durationMs: Date.now() - start });
      if (res.code !== 0) {
        hasError = true;
        break;
      }
    }
    return { success: !hasError, mode, results };
  }
}
