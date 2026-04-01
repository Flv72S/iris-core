/**
 * Phase 11D — Certificate Attestation Verifier.
 * Verifies governance certificate validity, node identity commitment, and trust anchor association.
 */

import type { FederatedNodeRecord, TrustAnchor } from '../../federated_node_registry/types/federated_node_registry_types.js';
import { verifyGovernanceCertificate } from '../../federated_node_registry/certificates/certificate_verifier.js';
import { verifyNodeIdentityCommitment } from '../../federated_node_registry/hashing/node_identity_commitment.js';
import type { CertificateAttestationResult } from '../types/trust_types.js';

/**
 * Verify certificate and identity attestation for a single node.
 */
function verifySingleNode(
  node: FederatedNodeRecord,
  trustAnchors: readonly TrustAnchor[],
  asOfTime: number
): CertificateAttestationResult {
  const certResult = verifyGovernanceCertificate(node.certificate, trustAnchors, asOfTime);
  const certificate_valid = certResult.valid;
  const commitment_verified = verifyNodeIdentityCommitment(node);
  const trust_anchor_associated = trustAnchors.some(
    (ta) => ta.trust_anchor_id === node.trust_anchor_id || ta.organization === node.trust_anchor_id
  );
  const valid = certificate_valid && commitment_verified && trust_anchor_associated;
  const reasonStr = valid ? undefined : [certResult.reason, !commitment_verified && 'commitment_mismatch', !trust_anchor_associated && 'trust_anchor_unknown'].filter(Boolean).join('; ') || undefined;

  const result: CertificateAttestationResult =
    reasonStr !== undefined
      ? Object.freeze({ node_id: node.node_id, valid, reason: reasonStr, certificate_valid, commitment_verified, trust_anchor_associated })
      : Object.freeze({ node_id: node.node_id, valid, certificate_valid, commitment_verified, trust_anchor_associated });
  return result;
}

/**
 * Verify certificate attestations for all nodes.
 * Output sorted lexicographically by node_id.
 */
export function verifyCertificateAttestations(
  nodes: readonly FederatedNodeRecord[],
  trustAnchors: readonly TrustAnchor[],
  asOfTime: number = Date.now()
): CertificateAttestationResult[] {
  const sorted = [...nodes].sort((a, b) => a.node_id.localeCompare(b.node_id));
  return sorted.map((node) => verifySingleNode(node, trustAnchors, asOfTime));
}
