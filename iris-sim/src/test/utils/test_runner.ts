import { spawn } from 'node:child_process';

export type TestRunResult = {
  pattern: string;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

/** Observability stress and broad test globs can exceed 60s on loaded hosts. */
const TIMEOUT_MS = 120_000;

export async function runTestSuite(pattern: string, timeoutMs = TIMEOUT_MS): Promise<TestRunResult> {
  const startedAt = Date.now();
  const args = ['--import', './dist/test/setup/bootstrap.js', '--test', pattern];
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let settled = false;

  child.stdout.on('data', (chunk: Buffer | string) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!settled) child.kill('SIGKILL');
      }, 1500);
    }, timeoutMs);
    if (typeof timeout.unref === 'function') timeout.unref();

    child.once('error', (err) => {
      clearTimeout(timeout);
      settled = true;
      reject(err);
    });

    child.once('close', (code) => {
      clearTimeout(timeout);
      settled = true;
      resolve(code);
    });
  });

  return {
    pattern,
    exitCode,
    durationMs: Date.now() - startedAt,
    stdout,
    stderr,
    timedOut,
  };
}
