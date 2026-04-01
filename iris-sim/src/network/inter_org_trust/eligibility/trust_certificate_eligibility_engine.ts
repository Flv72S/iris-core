/**
 * Phase 11D.2 — Trust Certificate Eligibility Engine.
 * Deterministic evaluation: trust level → eligibility status and reason.
 */

import type { NodeTrustIndex } from '../types/trust_types.js';
import type { NodeCertificateEligibility, CertificateEligibilityStatus, CertificateEligibilityReason } from './trust_certificate_eligibility_types.js';

function eligibilityFromTrustLevel(trust_level: NodeTrustIndex['trust_level']): {
  status: CertificateEligibilityStatus;
  reason: CertificateEligibilityReason;
} {
  switch (trust_level) {
    case 'HIGH':
      return { status: 'ELIGIBLE', reason: 'TRUST_HIGH' };
    case 'MEDIUM':
      return { status: 'PROBATION', reason: 'TRUST_MEDIUM' };
    case 'LOW':
      return { status: 'PROBATION', reason: 'TRUST_LOW' };
    case 'UNTRUSTED':
      return { status: 'INELIGIBLE', reason: 'NODE_UNTRUSTED' };
  }
}

/**
 * Evaluate certificate eligibility for all nodes from their trust indices.
 * Nodes are sorted lexicographically by node_id. Deterministic and stateless.
 */
export function evaluateCertificateEligibility(
  trustIndices: readonly NodeTrustIndex[],
  timestamp: number
): readonly NodeCertificateEligibility[] {
  const sorted = [...trustIndices].sort((a, b) => a.node_id.localeCompare(b.node_id));
  return sorted.map((n) => {
    const { status, reason } = eligibilityFromTrustLevel(n.trust_level);
    return Object.freeze({
      node_id: n.node_id,
      organization_id: n.organization_id,
      trust_index: n.trust_index,
      trust_level: n.trust_level,
      eligibility_status: status,
      eligibility_reason: reason,
      evaluated_timestamp: timestamp,
    });
  });
}
