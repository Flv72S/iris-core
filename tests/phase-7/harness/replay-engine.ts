/**
 * Replay Engine — Phase 7.V
 *
 * Ricarica audit snapshot, riesegue ActionIntent, confronta output originale vs replay.
 */

import type { ExecutionResult } from '../../../src/core/execution/ExecutionResult';
import type { ExecutionAuditEntry } from '../../../src/core/execution/audit/ExecutionAuditLog';
import type { ExecutionHarnessOutput } from './execution-harness';
import { runExecutionHarness } from './execution-harness';
import type { ResolutionFixture } from '../fixtures/resolution-states/types';
import type { ActionIntentFixture } from '../fixtures/action-intents/types';
import type { KillSwitchScenarioFixture } from '../fixtures/kill-switch-scenarios/types';

export type ReplayResult = {
  readonly identical: boolean;
  readonly diff?: unknown;
};

/**
 * Confronta due ExecutionResult (status e campi rilevanti).
 */
function compareResults(a: ExecutionResult, b: ExecutionResult): unknown | undefined {
  if (a.status !== b.status) {
    return { kind: 'status', original: a.status, replay: b.status };
  }
  if (a.status === 'EXECUTED' && b.status === 'EXECUTED') {
    if (a.executedAt !== b.executedAt) {
      return { kind: 'executedAt', original: a.executedAt, replay: b.executedAt };
    }
  }
  if ((a.status === 'SKIPPED' || a.status === 'BLOCKED') && (b.status === 'SKIPPED' || b.status === 'BLOCKED')) {
    if (a.reason !== b.reason) {
      return { kind: 'reason', original: a.reason, replay: b.reason };
    }
  }
  return undefined;
}

/**
 * Confronta due snapshot di audit (stesso numero di entry, stessi result per ordine).
 */
function compareAuditSnapshots(
  original: readonly ExecutionAuditEntry[],
  replay: readonly ExecutionAuditEntry[]
): unknown | undefined {
  if (original.length !== replay.length) {
    return { kind: 'auditLength', original: original.length, replay: replay.length };
  }
  for (let i = 0; i < original.length; i++) {
    const d = compareResults(original[i].result, replay[i].result);
    if (d != null) {
      return { kind: 'auditEntry', index: i, diff: d };
    }
  }
  return undefined;
}

export type ReplayInput = {
  readonly originalOutput: ExecutionHarnessOutput;
  readonly resolution: ResolutionFixture;
  readonly intentFixture: ActionIntentFixture;
  readonly killSwitch?: KillSwitchScenarioFixture | null;
  readonly nowMs?: number;
  readonly wellbeingBlocked?: boolean;
  readonly recentEntries?: readonly ExecutionAuditEntry[];
};

/**
 * Riesegue con gli stessi input dell’harness e confronta result + audit.
 */
export function runReplay(input: ReplayInput): ReplayResult {
  const replayOutput = runExecutionHarness({
    resolution: input.resolution,
    intentFixture: input.intentFixture,
    killSwitch: input.killSwitch ?? null,
    nowMs: input.nowMs,
    wellbeingBlocked: input.wellbeingBlocked,
    recentEntries: input.recentEntries,
  });

  const resultDiff = compareResults(input.originalOutput.result, replayOutput.result);
  if (resultDiff != null) {
    return Object.freeze({ identical: false, diff: resultDiff });
  }

  const auditDiff = compareAuditSnapshots(
    input.originalOutput.auditSnapshot,
    replayOutput.auditSnapshot
  );
  if (auditDiff != null) {
    return Object.freeze({ identical: false, diff: auditDiff });
  }

  return Object.freeze({ identical: true });
}
