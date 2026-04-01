/**
 * Step 10C — Cross-Node Governance Verification Engine. Registry integration.
 */

import type { GovernanceCertificateRecord } from '../../governance_registry/types/governance_registry_types.js';
import type { GovernanceCertificateRegistry } from '../../governance_registry/registry/governance_certificate_registry.js';
import type { CrossNodeVerificationInput, CrossNodeVerificationResult } from '../types/cross_node_verification_types.js';
import { verifyCrossNodeCertificate } from '../engine/cross_node_verification_engine.js';

export interface StoreVerifiedCertificateOutcome {
  readonly result: CrossNodeVerificationResult;
  readonly record: GovernanceCertificateRecord | null;
}

/**
 * Verify certificate and issuing node; store in registry only if both
 * node_identity_valid and governance_verification.verification_status === 'PASS'.
 */
export function storeVerifiedCertificate(
  registry: GovernanceCertificateRegistry,
  input: CrossNodeVerificationInput
): StoreVerifiedCertificateOutcome {
  const result = verifyCrossNodeCertificate(input);
  const mayStore =
    result.node_identity_valid &&
    result.governance_verification.verification_status === 'PASS';
  const record: GovernanceCertificateRecord | null = mayStore
    ? registry.storeCertificate(input.certificate)
    : null;
  return Object.freeze({ result, record });
}
