/**
 * Step 8L — Governance Autonomous Watcher. Read-only self-monitoring.
 */

export type { GovernanceAlert, AlertSeverity } from './types/governance_alert.js';
export { createGovernanceAlert } from './types/governance_alert.js';
export { detectPolicyViolations } from './detection/policy_violation_detector.js';
export { detectGovernanceDrift } from './detection/governance_drift_detector.js';
export { detectLedgerIntegrityIssues } from './detection/ledger_integrity_detector.js';
export type { GovernanceEvent } from './detection/suspicious_event_detector.js';
export { detectSuspiciousEvents } from './detection/suspicious_event_detector.js';
export type { RunGovernanceCheckParams } from './watcher/governance_watcher.js';
export { runGovernanceCheck } from './watcher/governance_watcher.js';
