/**
 * User Preference Audit — Append-only, frozen, leggibile. Nessun profiling.
 */

import type { FeaturePolicyDecision } from '../../policies/FeaturePolicyDecision';

export type UserPreferenceAuditEntry = {
  readonly preferenceId: string;
  readonly decision: FeaturePolicyDecision;
  readonly evaluatedAt: number;
};

let auditStore: readonly UserPreferenceAuditEntry[] = Object.freeze([]);

export function appendPreferenceAudit(entry: UserPreferenceAuditEntry): void {
  auditStore = Object.freeze([...auditStore, Object.freeze(entry)]);
}

export function readPreferenceAudit(): readonly UserPreferenceAuditEntry[] {
  return auditStore;
}

export function _resetPreferenceAuditForTest(): void {
  auditStore = Object.freeze([]);
}
