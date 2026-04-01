/**
 * Policy Audit — Append-only, leggibile, frozen. Nessuna aggregazione.
 */

import type { FeaturePolicyDecision } from '../FeaturePolicyDecision';

export interface PolicyAuditEntry {
  readonly featureId: string;
  readonly policyId: string;
  readonly decision: FeaturePolicyDecision;
  readonly evaluatedAt: number;
}

let policyAuditStore: readonly PolicyAuditEntry[] = Object.freeze([]);

export function appendPolicyAudit(entry: PolicyAuditEntry): void {
  policyAuditStore = Object.freeze([...policyAuditStore, Object.freeze(entry)]);
}

export function readPolicyAudit(): readonly PolicyAuditEntry[] {
  return policyAuditStore;
}

export function _resetPolicyAuditForTest(): void {
  policyAuditStore = Object.freeze([]);
}
