/**
 * Phase 11E — Trust Certification Engine.
 * Generates verifiable trust certificates for eligible nodes. Deterministic, stateless.
 */

import type { NodeTrustIndex } from '../inter_org_trust/types/trust_types.js';
import type { NodeCertificateEligibility } from '../inter_org_trust/eligibility/trust_certificate_eligibility_types.js';
import type { FederatedTrustCertificate } from './types/trust_certificate_types.js';
import { generateTrustCertificates } from './generation/trust_certificate_generator.js';

/**
 * Run the trust certification engine: generate certificates for eligible nodes only.
 * Output sorted lexicographically by node_id. Identical inputs → identical outputs.
 */
export function runTrustCertificationEngine(
  trustIndices: readonly NodeTrustIndex[],
  eligibility: readonly NodeCertificateEligibility[],
  timestamp: number
): readonly FederatedTrustCertificate[] {
  return generateTrustCertificates(trustIndices, eligibility, timestamp);
}
