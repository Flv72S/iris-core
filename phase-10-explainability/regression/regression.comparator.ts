/**
 * Phase 10.X.3 — Regression Comparator Engine (puro, deterministico, senza tolleranze)
 *
 * Confronta Golden salvata con rigenerazione runtime. Qualsiasi differenza = regressione.
 */

import type { GoldenTrace } from '../golden/golden.dataset';
import { GOLDEN_SCENARIOS } from '../golden/golden.scenarios';
import { buildExplanation } from '../explanation/explanation.engine';

export interface RegressionDiff {
  readonly traceChanged: boolean;
  readonly explanationChanged: boolean;
  readonly hashChanged: boolean;
  readonly details: readonly string[];
}

export interface RegressionResult {
  readonly scenarioId: string;
  readonly traceEqual: boolean;
  readonly explanationEqual: boolean;
  readonly hashEqual: boolean;
  readonly diff?: RegressionDiff;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildDiff(
  scenarioId: string,
  golden: GoldenTrace,
  traceEqual: boolean,
  explanationEqual: boolean,
  hashEqual: boolean
): RegressionDiff {
  const details: string[] = [];
  if (!traceEqual) details.push(`trace: structural mismatch for scenario ${scenarioId}`);
  if (!explanationEqual) details.push(`explanation: structural mismatch for scenario ${scenarioId}`);
  if (!hashEqual) details.push(`explanationHash: expected ${golden.explanationHash}, regenerated hash differs`);
  return Object.freeze({
    traceChanged: !traceEqual,
    explanationChanged: !explanationEqual,
    hashChanged: !hashEqual,
    details: Object.freeze(details),
  });
}

/**
 * Confronta una Golden trace con la rigenerazione dalla factory.
 * Rigenera trace dalla factory, rigenera explanation, confronto deep.
 * Nessuna tolleranza: qualsiasi differenza produce failed.
 */
export function compareGoldenWithRuntime(golden: GoldenTrace): RegressionResult {
  const scenario = GOLDEN_SCENARIOS.find((s) => s.scenarioId === golden.scenarioId);
  if (!scenario) {
    const diff = Object.freeze({
      traceChanged: true,
      explanationChanged: true,
      hashChanged: true,
      details: Object.freeze([`scenario not found: ${golden.scenarioId}`]),
    });
    return Object.freeze({
      scenarioId: golden.scenarioId,
      traceEqual: false,
      explanationEqual: false,
      hashEqual: false,
      diff,
    });
  }

  const traceRegen = scenario.buildTrace();
  const explanationRegen = buildExplanation(traceRegen);

  const traceEqual = deepEqual(golden.trace, traceRegen);
  const explanationEqual = deepEqual(golden.explanation, explanationRegen);
  const hashEqual = golden.explanationHash === explanationRegen.explanationHash;

  const passed = traceEqual && explanationEqual && hashEqual;
  const diff =
    passed === false
      ? buildDiff(golden.scenarioId, golden, traceEqual, explanationEqual, hashEqual)
      : undefined;

  return Object.freeze({
    scenarioId: golden.scenarioId,
    traceEqual,
    explanationEqual,
    hashEqual,
    diff,
  });
}
