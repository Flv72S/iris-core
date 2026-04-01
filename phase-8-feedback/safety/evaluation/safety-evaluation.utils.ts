/**
 * Phase 8.2.2 — Pure helpers for safety evaluation (no date, no random)
 */

import type { ActionOutcome, OutcomeStatus } from '../../outcome/model/outcome.types';

export function countOutcomesByStatus(
  outcomes: readonly ActionOutcome[],
  status: OutcomeStatus
): number {
  return outcomes.filter((o) => o.status === status).length;
}

export function countFailedOutcomes(outcomes: readonly ActionOutcome[]): number {
  return countOutcomesByStatus(outcomes, 'FAILED');
}

export function getMaxConsecutiveFailures(outcomes: readonly ActionOutcome[]): number {
  let max = 0;
  let current = 0;
  for (const o of outcomes) {
    if (o.status === 'FAILED') {
      current += 1;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }
  return max;
}

export function hasOutcomeWithStatus(
  outcomes: readonly ActionOutcome[],
  status: OutcomeStatus
): boolean {
  return outcomes.some((o) => o.status === status);
}
