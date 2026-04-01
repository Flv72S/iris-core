/**
 * Step 8K — External certificate verifier. Uses Trust Anchor (8J) to verify certificate signature.
 */

import type { GovernanceCertificate } from '../../governance_certificate_engine/types/certification_types.js';
import type { GovernanceSignature } from '../../trust_anchor/types/trust_anchor_types.js';
import { verifyGovernanceSignature } from '../../trust_anchor/verify/governance_signature_verifier.js';
import type { VerificationResult } from '../types/verifier_types.js';

/**
 * Verify governance certificate using Trust Anchor signature. External parties need certificate + signature from IRIS.
 */
export function verifyGovernanceCertificateExternal(
  certificate: GovernanceCertificate,
  signature: GovernanceSignature
): VerificationResult {
  const ok = verifyGovernanceSignature(certificate, signature);
  if (ok) return Object.freeze({ valid: true });
  return Object.freeze({ valid: false, reason: 'invalid_signature' });
}
