/**
 * Execution Audit Log — Append-only, frozen entries. Nessuna azione silenziosa.
 */

import type { ExecutionActionType } from '../ExecutionAction';
import type { ExecutionResult } from '../ExecutionResult';

export interface ExecutionAuditEntry {
  readonly actionId: string;
  readonly type: ExecutionActionType;
  readonly sourceFeature: string;
  readonly requestedAt: number;
  readonly result: ExecutionResult;
}

let auditStore: readonly ExecutionAuditEntry[] = Object.freeze([]);

export function appendAudit(entry: ExecutionAuditEntry): void {
  const next = Object.freeze([...auditStore, Object.freeze(entry)]);
  auditStore = next;
}

export function readAudit(): readonly ExecutionAuditEntry[] {
  return auditStore;
}

/** Reset per test deterministici. Non esporre in produzione. */
export function _resetAuditForTest(): void {
  auditStore = Object.freeze([]);
}
