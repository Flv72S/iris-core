import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { discoverTestSuites } from './utils/test_discovery.js';
import { assertNoOpenHandles } from './utils/open_handle_tracker.js';
import { runTestSuite, type TestRunResult } from './utils/test_runner.js';

type CertificationAuditReport = {
  generatedAt: string;
  cwd: string;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  allPassed: boolean;
  totalDurationMs: number;
  suites: TestRunResult[];
};

const FAIL_PATTERNS = ['open handle', 'still active', 'ws handles still active'];

function hasForbiddenStderr(stderr: string): boolean {
  const hay = stderr.toLowerCase();
  return FAIL_PATTERNS.some((p) => hay.includes(p));
}

function suitePassed(result: TestRunResult): boolean {
  return result.exitCode === 0 && !result.timedOut && !hasForbiddenStderr(result.stderr);
}

function writeAuditReport(report: CertificationAuditReport): string {
  const outDir = path.resolve(process.cwd(), 'dist', '.iris');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'certification-report.json');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outPath;
}

export async function runCertificationWithAuditReport(): Promise<void> {
  const suites = discoverTestSuites();
  if (suites.length === 0) {
    throw new Error('No test suites discovered under dist/**/*.test.js');
  }

  const results: TestRunResult[] = [];
  const startedAt = Date.now();
  for (const pattern of suites) {
    results.push(await runTestSuite(pattern));
  }

  const passedSuites = results.filter(suitePassed).length;
  const failedSuites = results.length - passedSuites;
  const report: CertificationAuditReport = {
    generatedAt: new Date().toISOString(),
    cwd: process.cwd(),
    totalSuites: results.length,
    passedSuites,
    failedSuites,
    allPassed: failedSuites === 0,
    totalDurationMs: Date.now() - startedAt,
    suites: results,
  };

  const outPath = writeAuditReport(report);
  assertNoOpenHandles();

  if (!report.allPassed) {
    const failed = results.find((r) => !suitePassed(r));
    throw new Error(`CERTIFICATION FAILED (audit report: ${outPath})

Suite: ${failed?.pattern ?? 'unknown'}
Exit: ${failed?.exitCode ?? 'unknown'}
Timed out: ${failed?.timedOut ?? 'unknown'}
`);
  }

  console.log(`✅ CERTIFICATION AUDIT REPORT WRITTEN: ${outPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCertificationWithAuditReport().catch((err: unknown) => {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error(msg);
    process.exitCode = 1;
  });
}
