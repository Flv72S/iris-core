/**
 * Execution Engine Core — Fase 7.1
 *
 * Input solo da ResolutionResult. Nessuna decisione autonoma.
 * Idempotenza obbligatoria (via idempotencyKey); azioni atomiche; determinismo replayabile.
 */

import type { ActionIntent } from './action-intent';
import { isResolutionStatusExecutable } from './action-intent';
import type { ExecutionResult } from './ExecutionResult';
import type { ExecutionContext } from './ExecutionContext';
import type { DomainExecutor } from './domain-executors/DomainExecutor';
import type { ExecutionActionType } from './ExecutionAction';
import { appendAudit } from './audit/ExecutionAuditLog';
import { isExecutionEnabled, EXECUTION_ENGINE_COMPONENT_ID } from './kill-switch/ExecutionKillSwitch';

/** Store opzionale per idempotenza: stesso key non riesegue. */
export interface IdempotencyStore {
  has(key: string): boolean;
  add(key: string): void;
}

/**
 * Esegue solo se resolutionResult.status è ALLOWED o FORCED.
 * Mapping Resolution → Execution: BLOCKED/SUSPENDED → nessuna esecuzione; ALLOWED/FORCED → delega al domain executor.
 */
export function executeFromResolution(
  intent: ActionIntent,
  resolutionStatus: string,
  context: ExecutionContext,
  executors: Readonly<Record<ExecutionActionType, DomainExecutor>>,
  idempotencyStore?: IdempotencyStore
): ExecutionResult {
  if (!isExecutionEnabled(context.registry, EXECUTION_ENGINE_COMPONENT_ID)) {
    const result: ExecutionResult = Object.freeze({
      status: 'BLOCKED',
      reason: 'Execution engine disabled',
    });
    appendExecutionAudit(intent, result);
    return result;
  }

  if (!isResolutionStatusExecutable(resolutionStatus)) {
    const result: ExecutionResult = Object.freeze({
      status: 'BLOCKED',
      reason: `Resolution status does not allow execution: ${resolutionStatus}`,
    });
    appendExecutionAudit(intent, result);
    return result;
  }

  if (intent.idempotencyKey != null && idempotencyStore?.has(intent.idempotencyKey)) {
    const result: ExecutionResult = Object.freeze({
      status: 'SKIPPED',
      reason: 'Idempotency: already executed',
    });
    appendExecutionAudit(intent, result);
    return result;
  }

  const executor = executors[intent.actionType];
  if (executor == null) {
    const result: ExecutionResult = Object.freeze({
      status: 'BLOCKED',
      reason: `No executor for ${intent.actionType}`,
    });
    appendExecutionAudit(intent, result);
    return result;
  }

  const result = executor.execute(intent, context.now);

  if (
    intent.idempotencyKey != null &&
    idempotencyStore != null &&
    result.status === 'EXECUTED'
  ) {
    idempotencyStore.add(intent.idempotencyKey);
  }

  appendExecutionAudit(intent, result);
  return result;
}

function appendExecutionAudit(intent: ActionIntent, result: ExecutionResult): void {
  appendAudit(
    Object.freeze({
      actionId: intent.intentId,
      type: intent.actionType,
      sourceFeature: intent.sourceFeature,
      requestedAt: intent.requestedAt,
      result,
    })
  );
}

/** Store in-memory per idempotenza (replay e test). Reset solo in test. */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private keys = new Set<string>();

  has(key: string): boolean {
    return this.keys.has(key);
  }

  add(key: string): void {
    this.keys.add(key);
  }

  /** Solo test. */
  _clear(): void {
    this.keys.clear();
  }
}
