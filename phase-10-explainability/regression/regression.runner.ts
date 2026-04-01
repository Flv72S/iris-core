/**
 * Phase 10.X.3 — Regression Suite Runner (deterministico, ordine per scenarioId)
 */

import type { RegressionResult } from './regression.comparator';
import { compareGoldenWithRuntime } from './regression.comparator';
import { GOLDEN_TRACES } from '../golden/golden.dataset';

/**
 * Esegue la suite di regression explainability su tutte le GOLDEN_TRACES.
 * Restituisce risultati frozen, ordinati per scenarioId.
 */
export function runExplainabilityRegressionSuite(): readonly RegressionResult[] {
  const results: RegressionResult[] = [];
  for (const golden of GOLDEN_TRACES) {
    results.push(compareGoldenWithRuntime(golden));
  }
  results.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
  return Object.freeze(results.map((r) => Object.freeze(r)));
}
