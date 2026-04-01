// User Preferences restrict execution.
// They never enable, prioritize, or override system decisions.

export type UserPreferenceAuditEntry = {
  readonly featureId: string;
  readonly decision: 'ALLOWED' | 'BLOCKED';
  readonly reason?: string;
  readonly evaluatedAt: number;
};

let auditStore: readonly UserPreferenceAuditEntry[] = Object.freeze([]);

export function appendUserPreferenceAudit(entry: UserPreferenceAuditEntry): void {
  auditStore = Object.freeze([...auditStore, Object.freeze(entry)]);
}

export function readUserPreferenceAudit(): readonly UserPreferenceAuditEntry[] {
  return auditStore;
}

/** Reset solo per test. */
export function _resetUserPreferenceAuditForTest(): void {
  auditStore = Object.freeze([]);
}
