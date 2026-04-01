/**
 * Execution Audit Log — Fase 7.4
 *
 * Log append-only con: trace lifecycle, correlazione Resolution, snapshot before/after.
 * Ogni record è immutabile e serializzabile.
 */

import type { ExecutionActionType } from './ExecutionAction';
import type { ExecutionResult } from './ExecutionResult';
import type { ActionLifecycleAuditEntry } from './action-lifecycle';

/** Traccia lifecycle: sequenza di transizioni per questa azione (snapshot al momento del record). */
export type LifecycleTrace = readonly ActionLifecycleAuditEntry[];

/** Correlazione con la Resolution (Fase 6.5) da cui è scaturita l'esecuzione. */
export type ResolutionCorrelation = {
  readonly resolutionId: string;
  readonly executionRequestId: string | null;
  readonly resolutionStatus: string;
};

/** Record di audit esecuzione: append-only, frozen. */
export type ExecutionAuditRecord = {
  readonly actionId: string;
  readonly type: ExecutionActionType;
  readonly sourceFeature: string;
  readonly requestedAt: number;
  readonly result: ExecutionResult;
  /** Timestamp di registrazione (ordinamento e replay). */
  readonly recordedAt: number;
  /** Correlazione con Resolution. */
  readonly resolution?: ResolutionCorrelation;
  /** Trace delle transizioni di lifecycle (planned → executing → …) al momento del record. */
  readonly lifecycleTrace?: LifecycleTrace;
  /** Snapshot stato/contesto prima dell'esecuzione (serializzabile). */
  readonly snapshotBefore?: unknown;
  /** Snapshot stato/risultato dopo l'esecuzione (serializzabile). */
  readonly snapshotAfter?: unknown;
};

/** Input per append: campi obbligatori + opzionali per correlazione e snapshot. */
export type ExecutionAuditRecordInput = {
  readonly actionId: string;
  readonly type: ExecutionActionType;
  readonly sourceFeature: string;
  readonly requestedAt: number;
  readonly result: ExecutionResult;
  readonly recordedAt?: number;
  readonly resolution?: ResolutionCorrelation;
  readonly lifecycleTrace?: LifecycleTrace;
  readonly snapshotBefore?: unknown;
  readonly snapshotAfter?: unknown;
};

let executionAuditStore: readonly ExecutionAuditRecord[] = Object.freeze([]);

/**
 * Aggiunge un record al log. Append-only; il record viene frozen.
 */
export function appendExecutionAuditRecord(record: ExecutionAuditRecordInput): void {
  const now = Date.now();
  const entry: ExecutionAuditRecord = Object.freeze({
    actionId: record.actionId,
    type: record.type,
    sourceFeature: record.sourceFeature,
    requestedAt: record.requestedAt,
    result: record.result,
    recordedAt: record.recordedAt ?? now,
    resolution: record.resolution,
    lifecycleTrace: record.lifecycleTrace,
    snapshotBefore: record.snapshotBefore,
    snapshotAfter: record.snapshotAfter,
  });
  executionAuditStore = Object.freeze([...executionAuditStore, entry]);
}

/**
 * Legge l'intero log (solo lettura). Ordine cronologico per recordedAt / append.
 */
export function readExecutionAudit(): readonly ExecutionAuditRecord[] {
  return executionAuditStore;
}

/**
 * Filtra i record per actionId.
 */
export function readExecutionAuditByActionId(
  actionId: string
): readonly ExecutionAuditRecord[] {
  return executionAuditStore.filter((r) => r.actionId === actionId);
}

/**
 * Filtra i record per resolutionId.
 */
export function readExecutionAuditByResolutionId(
  resolutionId: string
): readonly ExecutionAuditRecord[] {
  return executionAuditStore.filter((r) => r.resolution?.resolutionId === resolutionId);
}

/** Reset per test deterministici. Non esporre in produzione. */
export function _resetExecutionAuditForTest(): void {
  executionAuditStore = Object.freeze([]);
}
