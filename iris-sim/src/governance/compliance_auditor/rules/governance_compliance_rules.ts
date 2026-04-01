/**
 * Step 9D — Governance Compliance Auditor. Example rules (placeholder framework).
 */

import type {
  GovernanceComplianceContext,
  GovernanceComplianceRule,
} from '../types/governance_compliance_types.js';

/** Rule 1 — Snapshot hash present: snapshot_hash !== "" */
export const RULE_SNAPSHOT_HASH_PRESENT: GovernanceComplianceRule = Object.freeze({
  rule_id: 'snapshot_hash_present',
  description: 'Snapshot hash present',
  evaluate: (context: GovernanceComplianceContext) => context.snapshot_hash !== '',
});

/** Rule 2 — Query hash valid: query_hash !== "" */
export const RULE_QUERY_HASH_VALID: GovernanceComplianceRule = Object.freeze({
  rule_id: 'query_hash_valid',
  description: 'Query hash valid',
  evaluate: (context: GovernanceComplianceContext) => context.query_hash !== '',
});

/** Rule 3 — At least zero diffs applied (genesis or with diffs): applied_diffs.length >= 0 */
export const RULE_APPLIED_DIFFS_VALID: GovernanceComplianceRule = Object.freeze({
  rule_id: 'applied_diffs_valid',
  description: 'Applied diffs valid (genesis or with diffs)',
  evaluate: (context: GovernanceComplianceContext) => context.applied_diffs.length >= 0,
});

/** Default set of example rules for the framework. */
export const DEFAULT_COMPLIANCE_RULES: readonly GovernanceComplianceRule[] = Object.freeze([
  RULE_SNAPSHOT_HASH_PRESENT,
  RULE_QUERY_HASH_VALID,
  RULE_APPLIED_DIFFS_VALID,
]);
