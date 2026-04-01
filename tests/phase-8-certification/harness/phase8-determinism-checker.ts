/**
 * Phase 8 Certification — Determinism checker (N runs, all identical)
 */

import type { ActionOutcome } from '../../../phase-8-feedback/outcome/model/outcome.types';
import type { SafetyRule } from '../../../phase-8-feedback/safety/rules/safety-rule.types';
import type { Phase7BoundaryReport } from '../../../phase-8-feedback/safety/checklist/safety-checklist.types';
import type { Phase8ExecutionResult } from './phase8-execution-harness';
import { executePhase8Pipeline } from './phase8-execution-harness';

export interface Phase8DeterminismReport {
  readonly runs: number;
  readonly identical: boolean;
}

function resultsEqual(a: Phase8ExecutionResult, b: Phase8ExecutionResult): boolean {
  return (
    a.outcomeSnapshot.finalHash === b.outcomeSnapshot.finalHash &&
    a.checklistVerdict.status === b.checklistVerdict.status &&
    a.escalationEvent.level === b.escalationEvent.level &&
    a.attestationSnapshot.snapshotHash === b.attestationSnapshot.snapshotHash
  );
}

export function runPhase8DeterminismCheck(
  runs: number,
  outcomes: readonly ActionOutcome[],
  rules: readonly SafetyRule[],
  boundaryReport: Phase7BoundaryReport
): Phase8DeterminismReport {
  if (runs < 1) {
    return Object.freeze({ runs: 0, identical: true });
  }
  const first = executePhase8Pipeline(outcomes, rules, boundaryReport);
  let identical = true;
  for (let i = 1; i < runs; i++) {
    const next = executePhase8Pipeline(outcomes, rules, boundaryReport);
    if (!resultsEqual(first, next)) {
      identical = false;
      break;
    }
  }
  return Object.freeze({ runs, identical });
}
