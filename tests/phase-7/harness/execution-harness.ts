/**
 * Execution Harness — Phase 7.V
 *
 * Riceve ResolutionFixture + ActionIntentFixture, invoca l’executor corretto,
 * cattura output e registra audit snapshot. Nessuna logica decisionale.
 */

import type { ActionIntent } from '../../../src/core/execution/action-intent';
import type { ExecutionResult } from '../../../src/core/execution/ExecutionResult';
import type { ExecutionContext } from '../../../src/core/execution/ExecutionContext';
import type { ExecutionAuditEntry } from '../../../src/core/execution/audit/ExecutionAuditLog';
import { executeFromResolution } from '../../../src/core/execution/execution-engine-core';
import { DEFAULT_DOMAIN_EXECUTORS } from '../../../src/core/execution/domain-executors';
import type { ExecutionKillSwitchRegistry } from '../../../src/core/execution/kill-switch/ExecutionKillSwitch';
import { createSharedRegistry } from '../../../src/core/execution/killswitch-propagation';
import { readAudit, _resetAuditForTest } from '../../../src/core/execution/audit/ExecutionAuditLog';
import { InMemoryIdempotencyStore } from '../../../src/core/execution/execution-engine-core';
import type { ResolutionFixture } from '../fixtures/resolution-states/types';
import type { ActionIntentFixture } from '../fixtures/action-intents/types';
import type { KillSwitchScenarioFixture } from '../fixtures/kill-switch-scenarios/types';

export type ExecutionHarnessInput = {
  readonly resolution: ResolutionFixture;
  readonly intentFixture: ActionIntentFixture;
  readonly killSwitch?: KillSwitchScenarioFixture | null;
  /** Registry condiviso (es. per failure-injection kill-switch-during). Se assente, viene creato uno nuovo. */
  readonly registry?: ExecutionKillSwitchRegistry;
  /** Simulated now (ms). Default: parse resolution.timestamp. */
  readonly nowMs?: number;
  /** If true, wellbeingBlocked in context. */
  readonly wellbeingBlocked?: boolean;
  /** Recent entries for guardrails (e.g. to trigger cooldown/max-actions). */
  readonly recentEntries?: readonly ExecutionAuditEntry[];
};

export type ExecutionHarnessOutput = {
  readonly result: ExecutionResult;
  readonly auditSnapshot: readonly ExecutionAuditEntry[];
  readonly intent: ActionIntent;
  readonly contextUsed: { now: number; registryKeys: readonly string[] };
};

/**
 * Converte ActionIntentFixture in ActionIntent (requestedAt da ISO a ms).
 */
function fixtureToIntent(
  f: ActionIntentFixture,
  resolutionStatus: 'ALLOWED' | 'FORCED',
  resolutionId: string
): ActionIntent {
  const requestedAt = new Date(f.requestedAtIso).getTime();
  return Object.freeze({
    intentId: f.id,
    resolutionId,
    resolutionStatus,
    executionRequestId: null,
    actionType: f.type,
    payload: f.payload,
    sourceFeature: f.sourceFeature,
    requestedAt,
    idempotencyKey: f.idempotencyKey,
  });
}

/**
 * Esegue un singolo run: costruisce context, invoca executeFromResolution, cattura audit.
 */
export function runExecutionHarness(
  input: ExecutionHarnessInput,
  idempotencyStore?: InMemoryIdempotencyStore
): ExecutionHarnessOutput {
  _resetAuditForTest();

  const now = input.nowMs ?? new Date(input.resolution.timestamp).getTime();
  const registry = input.registry ?? createSharedRegistry();
  if (input.registry == null && input.killSwitch != null) {
    for (const [key, value] of Object.entries(input.killSwitch.registryOverrides)) {
      (registry as Record<string, boolean>)[key] = value;
    }
  }

  const recentEntries = input.recentEntries ?? [];
  const getRecentEntries = () => recentEntries;

  const context: ExecutionContext = Object.freeze({
    now,
    registry,
    getRecentEntries,
    wellbeingBlocked: input.wellbeingBlocked ?? false,
  });

  const resolutionStatus = input.resolution.resolvedState;
  const executable = resolutionStatus === 'ALLOWED' || resolutionStatus === 'FORCED';
  const intent = fixtureToIntent(
    input.intentFixture,
    executable ? (resolutionStatus as 'ALLOWED' | 'FORCED') : 'ALLOWED',
    input.resolution.id
  );

  const result = executeFromResolution(
    intent,
    resolutionStatus,
    context,
    DEFAULT_DOMAIN_EXECUTORS,
    idempotencyStore
  );

  const auditSnapshot = readAudit();

  return Object.freeze({
    result,
    auditSnapshot,
    intent,
    contextUsed: Object.freeze({
      now,
      registryKeys: Object.keys(registry),
    }),
  });
}
