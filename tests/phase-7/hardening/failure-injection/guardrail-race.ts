/**
 * Guardrail Race Condition — Phase 7.V+ Failure Injection
 *
 * Verifica blocco deterministico quando i limiti sono superati.
 */

import type { ExecutionResult } from '../../../../src/core/execution/ExecutionResult';

export type GuardrailRaceResult = {
  readonly allBlockedOrSkipped: boolean;
  readonly executedCount: number;
  readonly blockedOrSkippedCount: number;
  readonly deterministic: boolean;
};

export function evaluateGuardrailRace(
  results: readonly ExecutionResult[],
  maxExecutedAllowed: number
): GuardrailRaceResult {
  const executedCount = results.filter((r) => r.status === 'EXECUTED').length;
  const blockedOrSkippedCount = results.filter(
    (r) => r.status === 'BLOCKED' || r.status === 'SKIPPED'
  ).length;
  const withinLimit = executedCount <= maxExecutedAllowed;

  return Object.freeze({
    allBlockedOrSkipped: executedCount === 0,
    executedCount,
    blockedOrSkippedCount,
    deterministic: withinLimit,
  });
}

export function runGuardrailRaceScenario(
  runOnce: () => ExecutionResult,
  runTwice: () => ExecutionResult
): GuardrailRaceResult {
  const r1 = runOnce();
  const r2 = runTwice();
  return evaluateGuardrailRace([r1, r2], 1);
}
