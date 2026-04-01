/**
 * Step 9D — Governance Compliance Auditor. Engine.
 */

import type {
  GovernanceComplianceCheck,
  GovernanceComplianceContext,
  GovernanceComplianceInput,
  GovernanceComplianceReport,
} from '../types/governance_compliance_types.js';
import { computeGovernanceComplianceHash } from '../hashing/governance_compliance_hash.js';

/**
 * Evaluate governance compliance: build context from query_result, run all rules, produce report.
 * Does not mutate input.
 */
export function evaluateGovernanceCompliance(input: GovernanceComplianceInput): GovernanceComplianceReport {
  const q = input.query_result;
  const context: GovernanceComplianceContext = Object.freeze({
    snapshot_hash: q.reconstructed_snapshot_hash,
    query_timestamp: q.query_timestamp,
    query_hash: q.query_hash,
    applied_diffs: q.applied_diffs,
  });

  const checks: GovernanceComplianceCheck[] = input.rules.map((rule) =>
    Object.freeze({
      rule_id: rule.rule_id,
      passed: rule.evaluate(context),
    })
  );

  const compliant = checks.every((c) => c.passed);
  const snapshot_hash = q.reconstructed_snapshot_hash;
  const timestamp = q.query_timestamp;

  const report: GovernanceComplianceReport = {
    snapshot_hash,
    timestamp,
    checks: Object.freeze(checks),
    compliant,
    compliance_hash: '', // set below
  };

  const compliance_hash = computeGovernanceComplianceHash(report);

  return Object.freeze({
    ...report,
    compliance_hash,
  });
}
