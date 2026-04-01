import { discoverTestSuites } from './utils/test_discovery.js';
import { assertNoOpenHandles } from './utils/open_handle_tracker.js';
import { runTestSuite, type TestRunResult } from './utils/test_runner.js';
import { pathToFileURL } from 'node:url';

const FAIL_PATTERNS = ['open handle', 'still active', 'ws handles still active'];

function hasForbiddenStderr(stderr: string): boolean {
  const hay = stderr.toLowerCase();
  return FAIL_PATTERNS.some((p) => hay.includes(p));
}

export function assertCertificationResult(result: TestRunResult): void {
  if (result.exitCode !== 0 || result.timedOut || hasForbiddenStderr(result.stderr)) {
    throw new Error(`CERTIFICATION FAILED

Suite: ${result.pattern}
Exit: ${result.exitCode}
Timed out: ${result.timedOut}

STDERR:
${result.stderr}`);
  }
}

export async function runFullCertification(): Promise<void> {
  const suites = discoverTestSuites();
  if (suites.length === 0) {
    throw new Error('CERTIFICATION FAILED\n\nNo test suites discovered under dist/**/*.test.js');
  }

  const debug = process.env.IRIS_CERT_DEBUG === '1';
  for (const pattern of suites) {
    if (debug) console.log(`[CERT] Running suite: ${pattern}`);
    const result = await runTestSuite(pattern);
    if (debug) {
      console.log(
        `[CERT] Done suite=${pattern} exit=${result.exitCode} timeout=${result.timedOut} durationMs=${result.durationMs}`,
      );
    }

    assertCertificationResult(result);
  }

  assertNoOpenHandles();
  console.log('✅ ALL TEST SUITES CERTIFIED — NO OPEN HANDLES — EXIT 0');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFullCertification().catch((err: unknown) => {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(msg);
    process.exitCode = 1;
  });
}
