/**
 * Run Determinism Suite — Phase 7.V
 *
 * Esegue multiple run identiche, verifica determinismo forte, produce report sintetico.
 */

import { runDeterminismCheck } from '../harness/determinism-checker';
import type { DeterminismReport } from '../harness/determinism-checker';
import { ALL_RESOLUTION_FIXTURES } from '../fixtures/resolution-states';
import { ALL_ACTION_INTENT_FIXTURES } from '../fixtures/action-intents';

const FIXED_NOW = new Date('2025-01-15T10:00:00.000Z').getTime();
const DEFAULT_RUNS = 5;

export type DeterminismSuiteReport = {
  readonly total: number;
  readonly identical: number;
  readonly diverged: number;
  readonly details: readonly { label: string; report: DeterminismReport }[];
};

export function runDeterminismSuite(runs: number = DEFAULT_RUNS): DeterminismSuiteReport {
  const allowed = ALL_RESOLUTION_FIXTURES.find((r) => r.resolvedState === 'ALLOWED');
  const details: { label: string; report: DeterminismReport }[] = [];

  if (allowed == null) {
    return {
      total: 0,
      identical: 0,
      diverged: 0,
      details: [],
    };
  }

  for (const intentFixture of ALL_ACTION_INTENT_FIXTURES) {
    const report = runDeterminismCheck(
      {
        resolution: allowed,
        intentFixture,
        nowMs: FIXED_NOW,
      },
      runs
    );
    details.push({
      label: `determinism-${intentFixture.domain}-${intentFixture.type}`,
      report,
    });
  }

  const identical = details.filter((d) => d.report.identical).length;
  const diverged = details.filter((d) => !d.report.identical).length;

  return Object.freeze({
    total: details.length,
    identical,
    diverged,
    details,
  });
}

/** CLI entry when run as script. */
function main(): void {
  const suite = runDeterminismSuite();
  console.log('Phase 7.V — Determinism suite');
  console.log(`Total: ${suite.total}, Identical: ${suite.identical}, Diverged: ${suite.diverged}`);
  suite.details.forEach((d) => {
    const status = d.report.identical ? 'OK' : 'DIVERGED';
    console.log(`  [${status}] ${d.label}`);
    if (!d.report.identical && d.report.divergence != null) {
      console.log('    divergence:', d.report.divergence);
    }
  });
  process.exit(suite.diverged > 0 ? 1 : 0);
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('run-determinism-suite')) {
  main();
}
