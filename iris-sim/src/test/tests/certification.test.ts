import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { assertCertificationResult } from '../certification_runner.js';
import { runTestSuite } from '../utils/test_runner.js';

function writeTempTest(contents: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-cert-'));
  const file = path.join(dir, 'temp.test.js');
  fs.writeFileSync(file, contents, 'utf8');
  return file;
}

describe('Deterministic test suite certification (16D)', () => {
  it('runner base: executes simple suite with exitCode 0', async () => {
    const passFile = writeTempTest(`
      import { test } from 'node:test';
      import assert from 'node:assert';
      test('pass', () => assert.strictEqual(1, 1));
    `);
    const result = await runTestSuite(passFile);
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(result.timedOut, false);
  });

  it('timeout detection: non-terminating suite sets timedOut=true', async () => {
    const slowFile = writeTempTest(`
      import { test } from 'node:test';
      test('slow', async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });
    `);
    const result = await runTestSuite(slowFile, 25);
    assert.strictEqual(result.timedOut, true);
  });

  it('failure detection: certification result throws on failed suite', () => {
    assert.throws(
      () =>
        assertCertificationResult({
          pattern: 'dist/failing/**/*.test.js',
          exitCode: 1,
          durationMs: 5,
          stdout: '',
          stderr: 'simulated failure',
          timedOut: false,
        }),
      /CERTIFICATION FAILED/,
    );
  });
});
