/**
 * Phase 8 — Safety Checklist Report
 *
 * Sintesi del risultato della checklist (solo lettura).
 */

import type { SafetyChecklistResult, SafetyCheckId } from './safety-checklist.types';

export interface SafetyChecklistSummary {
  readonly fullySafe: boolean;
  readonly failedChecks: readonly SafetyCheckId[];
}

export function summarizeSafetyChecklist(
  result: SafetyChecklistResult
): SafetyChecklistSummary {
  const failedChecks: SafetyCheckId[] = result.results
    .filter((r) => !r.passed)
    .map((r) => r.checkId);
  return Object.freeze({
    fullySafe: result.fullySafe,
    failedChecks: Object.freeze(failedChecks) as readonly SafetyCheckId[],
  });
}
