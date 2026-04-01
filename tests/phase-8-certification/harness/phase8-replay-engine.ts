import type { ActionOutcome } from '../../../phase-8-feedback/outcome/model/outcome.types';
import type { SafetyRule } from '../../../phase-8-feedback/safety/rules/safety-rule.types';
import type { Phase7BoundaryReport } from '../../../phase-8-feedback/safety/checklist/safety-checklist.types';
import type { Phase8ExecutionResult } from './phase8-execution-harness';
import { executePhase8Pipeline } from './phase8-execution-harness';

export interface Phase8ReplayResult {
  readonly identical: boolean;
  readonly diff?: string;
}

function describeDiff(original: Phase8ExecutionResult, replayed: Phase8ExecutionResult): string {
  const parts: string[] = [];
  if (original.outcomeSnapshot.finalHash !== replayed.outcomeSnapshot.finalHash) parts.push('outcomeSnapshot.finalHash');
  if (original.checklistVerdict.status !== replayed.checklistVerdict.status) parts.push('checklistVerdict.status');
  if (original.escalationEvent.level !== replayed.escalationEvent.level) parts.push('escalationEvent.level');
  if (original.attestationSnapshot.snapshotHash !== replayed.attestationSnapshot.snapshotHash) parts.push('snapshotHash');
  return parts.length > 0 ? parts.join('; ') : '';
}

function deepEqualResults(a: Phase8ExecutionResult, b: Phase8ExecutionResult): boolean {
  return (
    a.outcomeSnapshot.finalHash === b.outcomeSnapshot.finalHash &&
    a.checklistVerdict.status === b.checklistVerdict.status &&
    a.escalationEvent.level === b.escalationEvent.level &&
    a.attestationSnapshot.snapshotHash === b.attestationSnapshot.snapshotHash
  );
}

export function replayPhase8(
  original: Phase8ExecutionResult,
  outcomes: readonly ActionOutcome[],
  rules: readonly SafetyRule[],
  boundaryReport: Phase7BoundaryReport
): Phase8ReplayResult {
  const replayed = executePhase8Pipeline(outcomes, rules, boundaryReport);
  const identical = deepEqualResults(original, replayed);
  return Object.freeze({ identical, diff: identical ? undefined : describeDiff(original, replayed) });
}
