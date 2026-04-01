import type { ComplianceActionType } from '../cluster_compliance_engine';

export const ACTION_PRIORITY: Readonly<Record<ComplianceActionType, number>> = Object.freeze({
  HALT_CLUSTER: 100,
  FREEZE_TRANSITIONS: 80,
  REQUIRE_MANUAL_INTERVENTION: 60,
  ESCALATE: 40,
  LOG_ONLY: 20,
  NO_OP: 0,
});

export function compareActions(a: ComplianceActionType, b: ComplianceActionType): number {
  const pa = ACTION_PRIORITY[a];
  const pb = ACTION_PRIORITY[b];
  if (pa === pb) return 0;
  return pa > pb ? 1 : -1;
}

export function maxAction(a: ComplianceActionType, b: ComplianceActionType): ComplianceActionType {
  return compareActions(a, b) >= 0 ? a : b;
}
