/**
 * Step 9D — Governance Compliance Auditor. Verifier.
 */

import type {
  GovernanceComplianceInput,
  GovernanceComplianceReport,
} from '../types/governance_compliance_types.js';
import { evaluateGovernanceCompliance } from '../engine/governance_compliance_engine.js';

/**
 * Verify a compliance report by re-running evaluation and comparing compliance_hash and checks.
 */
export function verifyGovernanceComplianceReport(
  input: GovernanceComplianceInput,
  report: GovernanceComplianceReport
): boolean {
  const expected = evaluateGovernanceCompliance(input);
  if (report.compliance_hash !== expected.compliance_hash) return false;
  if (report.compliant !== expected.compliant) return false;
  if (report.snapshot_hash !== expected.snapshot_hash) return false;
  if (report.timestamp !== expected.timestamp) return false;
  if (report.checks.length !== expected.checks.length) return false;
  for (let i = 0; i < report.checks.length; i++) {
    const a = report.checks[i]!;
    const b = expected.checks[i]!;
    if (a.rule_id !== b.rule_id || a.passed !== b.passed) return false;
  }
  return true;
}
