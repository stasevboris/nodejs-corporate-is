import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { handleInfo } from '../src/commands/info.js';
import { handleExec } from '../src/commands/exec.js';
import { handleClean } from '../src/commands/clean.js';
import { handlePipeline } from '../src/commands/pipeline.js';

test('sysops info executes without error and returns 0', async () => {
  const code = await handleInfo();
  assert.equal(code, 0);
});

test('sysops exec runs shell command successfully', async () => {
  const code = await handleExec('node -e "process.exit(0)"');
  assert.equal(code, 0);
});

test('sysops exec reports non-zero exit code properly', async () => {
  const code = await handleExec('node -e "process.exit(42)"');
  assert.equal(code, 42);
});

test('sysops exec handles timeout properly', async () => {
  const code = await handleExec('node -e "setTimeout(() => {}, 5000)"', 300);
  assert.equal(code, 124);
});

test('sysops clean safely handles dry-run and force clean', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sysops-test-'));
  const testFile = path.join(tmpDir, 'test.tmp');
  await fs.writeFile(testFile, 'hello');

  // Dry run
  const dryCode = await handleClean(tmpDir, { dryRun: true });
  assert.equal(dryCode, 0);
  assert.ok(await fs.stat(testFile)); // File must still exist!

  // Force clean
  const cleanCode = await handleClean(tmpDir, { force: true });
  assert.equal(cleanCode, 0);
  const remaining = await fs.readdir(tmpDir);
  assert.equal(remaining.length, 0); // File deleted

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test('sysops run-pipeline executes series and parallel', async () => {
  const pipelineConfig = {
    name: 'TestPipe',
    tasks: [
      { name: 'T1', command: 'node -e "process.exit(0)"' },
      { name: 'T2', command: 'node -e "process.exit(0)"' }
    ]
  };
  const tmpFile = path.join(os.tmpdir(), `pipe-test-${Date.now()}.json`);
  await fs.writeFile(tmpFile, JSON.stringify(pipelineConfig));

  const codeSeries = await handlePipeline(tmpFile, 'series');
  assert.equal(codeSeries, 0);

  const codeParallel = await handlePipeline(tmpFile, 'parallel');
  assert.equal(codeParallel, 0);

  await fs.unlink(tmpFile);
});
