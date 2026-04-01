/**
 * Phase 11E — Certificate Classification Engine.
 * Maps eligibility + trust level to certificate level. Deterministic.
 */

import type { NodeCertificateEligibility } from '../../inter_org_trust/eligibility/trust_certificate_eligibility_types.js';
import type { TrustCertificateLevel } from '../types/trust_certificate_types.js';

/**
 * Classify trust certificate level from eligibility. Returns null if ineligible.
 */
export function classifyTrustCertificate(
  eligibility: NodeCertificateEligibility
): TrustCertificateLevel | null {
  if (eligibility.eligibility_status === 'INELIGIBLE') return null;
  if (eligibility.eligibility_status === 'ELIGIBLE' && eligibility.trust_level === 'HIGH') return 'GOLD';
  if (eligibility.eligibility_status === 'PROBATION' && eligibility.trust_level === 'MEDIUM') return 'SILVER';
  if (eligibility.eligibility_status === 'PROBATION' && eligibility.trust_level === 'LOW') return 'BRONZE';
  return null;
}
