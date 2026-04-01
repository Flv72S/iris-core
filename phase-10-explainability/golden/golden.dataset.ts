/**
 * Phase 10.X.2 — Dataset Golden: materializzazione deterministica e congelamento.
 */

import type { DecisionTrace } from '../trace/decision-trace.types';
import type { Explanation } from '../explanation/explanation.types';
import { buildExplanation } from '../explanation/explanation.engine';
import { GOLDEN_SCENARIOS } from './golden.scenarios';

export interface GoldenTrace {
  readonly scenarioId: string;
  readonly trace: DecisionTrace;
  readonly explanation: Explanation;
  readonly explanationHash: string;
}

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  if (Array.isArray(obj)) obj.forEach(deepFreeze);
  else Object.values(obj).forEach(deepFreeze);
  return obj;
}

function buildGoldenTrace(scenarioId: string, trace: DecisionTrace): GoldenTrace {
  const explanation = buildExplanation(trace);
  const golden: GoldenTrace = {
    scenarioId,
    trace,
    explanation,
    explanationHash: explanation.explanationHash,
  };
  return deepFreeze(golden) as GoldenTrace;
}

/** Dataset completo: ordine deterministico, deep frozen. */
export const GOLDEN_TRACES: readonly GoldenTrace[] = (() => {
  const list: GoldenTrace[] = [];
  for (const scenario of GOLDEN_SCENARIOS) {
    const trace = scenario.buildTrace();
    list.push(buildGoldenTrace(scenario.scenarioId, trace));
  }
  return Object.freeze(list);
})();
