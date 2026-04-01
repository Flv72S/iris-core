/**
 * Step 9D — Governance Compliance Auditor. Types.
 */

import type { GovernanceHistoricalQueryResult } from '../../historical_query/types/governance_historical_query_types.js';

/** Context passed to each rule for evaluation (derived from query_result). */
export interface GovernanceComplianceContext {
  readonly snapshot_hash: string;
  readonly query_timestamp: number;
  readonly query_hash: string;
  readonly applied_diffs: readonly string[];
}

export interface GovernanceComplianceRule {
  readonly rule_id: string;
  readonly description: string;
  readonly evaluate: (context: GovernanceComplianceContext) => boolean;
}

export interface GovernanceComplianceInput {
  readonly query_result: GovernanceHistoricalQueryResult;
  readonly rules: readonly GovernanceComplianceRule[];
}

export interface GovernanceComplianceCheck {
  readonly rule_id: string;
  readonly passed: boolean;
}

export interface GovernanceComplianceReport {
  readonly snapshot_hash: string;
  readonly timestamp: number;
  readonly checks: readonly GovernanceComplianceCheck[];
  readonly compliant: boolean;
  readonly compliance_hash: string;
}
