/**
 * Step 10C — Cross-Node Governance Verification Engine.
 */

import type {
  CrossNodeVerificationInput,
  CrossNodeVerificationResult,
} from '../types/cross_node_verification_types.js';
import { validateIssuingNodeIdentity } from '../validation/node_identity_validation.js';
import { runIRISCertificateVerification } from '../../../governance/verification_engine/verify/governance_verifier.js';

/**
 * Verify a governance certificate issued by another node.
 * Validates issuing node identity and runs Phase 9 governance verification.
 */
export function verifyCrossNodeCertificate(
  input: CrossNodeVerificationInput
): CrossNodeVerificationResult {
  const node_identity_valid = validateIssuingNodeIdentity(
    input.issuing_node_identity
  );
  const governance_verification = runIRISCertificateVerification(
    input.certificate
  );
  const verification_timestamp = Date.now();

  return Object.freeze({
    certificate_id: input.certificate.certificate_hash,
    issuing_node_id: input.issuing_node_identity.node_id,
    node_identity_valid,
    governance_verification,
    verification_timestamp,
  });
}
