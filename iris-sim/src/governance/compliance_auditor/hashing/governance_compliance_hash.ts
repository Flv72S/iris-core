/**
 * Step 9D — Governance Compliance Auditor. Deterministic report hash.
 */

import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import type { GovernanceComplianceReport } from '../types/governance_compliance_types.js';

/**
 * Compute deterministic hash of the compliance report.
 */
export function computeGovernanceComplianceHash(report: GovernanceComplianceReport): string {
  return hashObjectDeterministic({
    snapshot_hash: report.snapshot_hash,
    timestamp: report.timestamp,
    checks: report.checks,
    compliant: report.compliant,
  });
}
