/**
 * Phase 10.X.3 — Regression Failure Aggregator (immutabile, serializzabile JSON stabile)
 */

import type { RegressionResult } from './regression.comparator';

export interface RegressionReport {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly failures: readonly RegressionResult[];
}

/**
 * Costruisce il report aggregato dai risultati della suite.
 * Immutabile, deterministico, serializzabile.
 */
export function buildRegressionReport(
  results: readonly RegressionResult[]
): RegressionReport {
  const failures = results.filter(
    (r) => !r.traceEqual || !r.explanationEqual || !r.hashEqual
  );
  const report: RegressionReport = Object.freeze({
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    failures: Object.freeze([...failures]),
  });
  return report;
}
