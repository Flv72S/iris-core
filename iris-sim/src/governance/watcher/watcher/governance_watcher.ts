/**
 * Step 8L — Governance Watcher. Read-only self-monitoring, aggregates all detectors.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import type { GovernanceLedger } from '../../ledger/types/ledger_types.js';
import type { GovernanceAlert } from '../types/governance_alert.js';
import type { GovernanceEvent } from '../detection/suspicious_event_detector.js';
import { detectPolicyViolations } from '../detection/policy_violation_detector.js';
import { detectGovernanceDrift } from '../detection/governance_drift_detector.js';
import { detectLedgerIntegrityIssues } from '../detection/ledger_integrity_detector.js';
import { detectSuspiciousEvents } from '../detection/suspicious_event_detector.js';

export interface RunGovernanceCheckParams {
  readonly governanceSnapshot: GovernanceTierSnapshot;
  readonly policyEnforcement: PolicyEnforcementResult;
  readonly runtimeDecision: RuntimeDecision;
  readonly certifiedSnapshotHash?: string;
  readonly ledger?: GovernanceLedger;
  readonly ledgerEvents?: readonly GovernanceEvent[];
}

/**
 * Run all governance checks. Returns combined alerts. Does not modify any IRIS state.
 */
export function runGovernanceCheck(params: RunGovernanceCheckParams): GovernanceAlert[] {
  const alerts: GovernanceAlert[] = [];

  alerts.push(
    ...detectPolicyViolations(params.policyEnforcement, params.runtimeDecision)
  );

  if (params.certifiedSnapshotHash !== undefined) {
    alerts.push(
      ...detectGovernanceDrift(params.governanceSnapshot, params.certifiedSnapshotHash)
    );
  }

  if (params.ledger !== undefined) {
    alerts.push(...detectLedgerIntegrityIssues(params.ledger));
  }

  if (params.ledgerEvents !== undefined && params.ledgerEvents.length > 0) {
    alerts.push(...detectSuspiciousEvents(params.ledgerEvents));
  }

  return alerts;
}
