/**
 * Phase 10.X.2 — Golden Decision Traces: factory immutabili di scenari canonici.
 *
 * Valori hardcoded deterministici. Nessun timestamp, UUID o randomness.
 * Ogni factory restituisce una DecisionTrace deep-frozen.
 */

import type { DecisionTrace } from '../trace/decision-trace.types';
import { buildDecisionTrace } from '../trace/decision-trace.builder';
import type { BuildDecisionTraceInput } from '../trace/decision-trace.builder';

/** Timestamp fisso per tutte le golden traces (determinismo CI). */
const GOLDEN_TIMESTAMP = '2025-01-01T00:00:00.000Z';

/** Hash outcome fisso per riproducibilità. */
const GOLDEN_OUTCOME_HASH = 'golden-outcome-hash';

export interface GoldenScenario {
  readonly scenarioId: string;
  readonly description: string;
  readonly buildTrace: () => DecisionTrace;
}

function freezeInput(input: BuildDecisionTraceInput): BuildDecisionTraceInput {
  return Object.freeze({
    traceId: input.traceId,
    timestamp: input.timestamp,
    resolvedState: Object.freeze({ ...input.resolvedState }),
    executionPlan: Object.freeze({ ...input.executionPlan }),
    executionResult: Object.freeze({ ...input.executionResult }),
    outcomeLogSnapshot: Object.freeze({
      finalHash: input.outcomeLogSnapshot.finalHash,
      entries: Object.freeze([...input.outcomeLogSnapshot.entries]),
    }),
    activeMode: input.activeMode,
  });
}

/** 1. Esecuzione consentita — modalità DEFAULT. Resolution ALLOWED, Execution SUCCESS, Outcome SUCCESS. */
export const SCENARIO_ALLOWED_DEFAULT: GoldenScenario = Object.freeze({
  scenarioId: 'allowed-default',
  description: 'Esecuzione consentita, modalità DEFAULT. Resolution ALLOWED, Execution SUCCESS, Outcome SUCCESS.',
  buildTrace: () => {
    const input = freezeInput({
      traceId: 'golden-allowed-default',
      timestamp: GOLDEN_TIMESTAMP,
      resolvedState: { summary: 'RESOLVED_ALLOWED' },
      executionPlan: {},
      executionResult: { success: true },
      outcomeLogSnapshot: { finalHash: GOLDEN_OUTCOME_HASH, entries: [] },
      activeMode: 'DEFAULT',
    });
    return buildDecisionTrace(input);
  },
});

/** 2. Blocco per sicurezza — modalità WELLBEING. Resolution BLOCKED, Execution SKIPPED, Outcome BLOCKED. */
export const SCENARIO_BLOCKED_WELLBEING: GoldenScenario = Object.freeze({
  scenarioId: 'blocked-wellbeing',
  description: 'Blocco per sicurezza, modalità WELLBEING. Resolution BLOCKED, Execution SKIPPED, Outcome BLOCKED.',
  buildTrace: () => {
    const input = freezeInput({
      traceId: 'golden-blocked-wellbeing',
      timestamp: GOLDEN_TIMESTAMP,
      resolvedState: { summary: 'RESOLVED_BLOCKED' },
      executionPlan: {},
      executionResult: { success: false },
      outcomeLogSnapshot: { finalHash: GOLDEN_OUTCOME_HASH, entries: [] },
      activeMode: 'WELLBEING',
    });
    return buildDecisionTrace(input);
  },
});

/** 3. Fallimento di esecuzione dopo allow — modalità FOCUS. Resolution ALLOWED, Execution FAILED, Outcome FAILURE. */
export const SCENARIO_ALLOWED_FAILED_FOCUS: GoldenScenario = Object.freeze({
  scenarioId: 'allowed-failed-focus',
  description: 'Fallimento esecuzione dopo allow, modalità FOCUS. Resolution ALLOWED, Execution FAILED, Outcome FAILURE.',
  buildTrace: () => {
    const input = freezeInput({
      traceId: 'golden-allowed-failed-focus',
      timestamp: GOLDEN_TIMESTAMP,
      resolvedState: { summary: 'RESOLVED_ALLOWED' },
      executionPlan: {},
      executionResult: { success: false },
      outcomeLogSnapshot: { finalHash: GOLDEN_OUTCOME_HASH, entries: [] },
      activeMode: 'FOCUS',
    });
    return buildDecisionTrace(input);
  },
});

/** 4. Percorso multi-step completo: STATE, RESOLUTION, EXECUTION, OUTCOME, MODE. */
export const SCENARIO_MULTI_STEP_COMPLETE: GoldenScenario = Object.freeze({
  scenarioId: 'multi-step-complete',
  description: 'Percorso multi-step completo. Trace con STATE, RESOLUTION, EXECUTION, OUTCOME, MODE.',
  buildTrace: () => {
    const input = freezeInput({
      traceId: 'golden-multi-step-complete',
      timestamp: GOLDEN_TIMESTAMP,
      resolvedState: { summary: 'RESOLVED_ALLOWED' },
      executionPlan: { step: 'complete' },
      executionResult: { success: true },
      outcomeLogSnapshot: { finalHash: GOLDEN_OUTCOME_HASH, entries: [] },
      activeMode: 'DEFAULT',
    });
    return buildDecisionTrace(input);
  },
});

/** Elenco ordinato e immutabile di tutti gli scenari golden. */
export const GOLDEN_SCENARIOS: readonly GoldenScenario[] = Object.freeze([
  SCENARIO_ALLOWED_DEFAULT,
  SCENARIO_BLOCKED_WELLBEING,
  SCENARIO_ALLOWED_FAILED_FOCUS,
  SCENARIO_MULTI_STEP_COMPLETE,
]);
