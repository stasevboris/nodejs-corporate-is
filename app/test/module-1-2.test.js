import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectSystemInfo } from '../src/modules/system-automation/system-info.js';
import { runProcess } from '../src/modules/system-automation/exec.js';
import { runPipeline } from '../src/modules/system-automation/pipeline.js';

test('[Модуль 1-2] Сбор системных метрик (ESM + CommonJS)', () => {
  const info = collectSystemInfo();
  assert.ok(info.platform, 'Платформа должна быть заполнена');
  assert.ok(info.memory.total, 'Память total должна быть заполнена');
  assert.ok(info.cpuCount > 0, 'CPU count должен быть > 0');
});

test('[Модуль 1-2] Запуск процесса ОС с кодом завершения 0', async () => {
  const res = await runProcess('node -e "process.exit(0)"', 1000);
  assert.equal(res.code, 0);
  assert.equal(res.timedOut, false);
});

test('[Модуль 1-2] Запуск процесса ОС с таймаутом', async () => {
  const res = await runProcess('node -e "setTimeout(()=>{}, 5000)"', 200);
  assert.equal(res.timedOut, true);
  assert.equal(res.code, 124);
});

test('[Модуль 1-2] Выполнение конвейера задач (серия и параллельно)', async () => {
  const tasks = [
    { name: 'T1', command: 'node -e "process.exit(0)"' },
    { name: 'T2', command: 'node -e "process.exit(0)"' }
  ];
  const seriesRes = await runPipeline(tasks, 'series');
  assert.equal(seriesRes.success, true);
  assert.equal(seriesRes.results.length, 2);

  const parallelRes = await runPipeline(tasks, 'parallel');
  assert.equal(parallelRes.success, true);
  assert.equal(parallelRes.results.length, 2);
});
