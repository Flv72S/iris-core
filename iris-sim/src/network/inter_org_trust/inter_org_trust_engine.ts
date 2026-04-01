/**
 * Phase 11D — Inter-Organizational Trust Engine.
 * Orchestrates trust index, certificate attestation, proof generation, and report building.
 */

import type { NodeMetadataWithCommitment } from '../federated_node_registry/federated_node_registry.js';
import type { NodeTrustScore } from '../cross_tenant_sla/trust/sla_trust_types.js';
import type { SLAConsensusCheckResult } from '../cross_tenant_sla/verification/sla_consensus_types.js';
import type { FederatedNodeRecord, TrustAnchor } from '../federated_node_registry/types/federated_node_registry_types.js';
import type { FederatedTrustReport } from './types/trust_types.js';
import { computeTrustIndices } from './evaluation/trust_index_engine.js';
import { verifyCertificateAttestations } from './attestation/certificate_attestation_verifier.js';
import { generateTrustProof } from './proof/trust_proof_generator.js';
import { buildFederatedTrustReport } from './report/federated_trust_report_builder.js';

/**
 * Parameters for the inter-org trust engine.
 */
export interface InterOrgTrustEngineParams {
  readonly nodeMetadata: readonly NodeMetadataWithCommitment[];
  readonly trustScores: readonly NodeTrustScore[];
  readonly slaConsensus?: SLAConsensusCheckResult | null;
  /** Optional: full node records for certificate attestation. If omitted, attestation_results will be empty. */
  readonly nodeRecords?: readonly FederatedNodeRecord[];
  /** Required when nodeRecords is provided. */
  readonly trustAnchors?: readonly TrustAnchor[];
  readonly timestamp?: number;
}

/**
 * Run the inter-organizational trust engine and produce a federated trust report.
 * Phase 11D.1: attestation runs first, then trust indices use multi-component model.
 * Deterministic: identical inputs produce identical report and report_hash.
 */
export function runInterOrgTrustEngine(params: InterOrgTrustEngineParams): FederatedTrustReport {
  const timestamp = params.timestamp ?? Date.now();
  const trustAnchors = params.trustAnchors ?? [];
  const nodeRecords = params.nodeRecords ?? [];
  const attestationResults =
    nodeRecords.length > 0 && trustAnchors.length > 0
      ? verifyCertificateAttestations(nodeRecords, trustAnchors, timestamp)
      : [];
  const organizationIdByNode: Record<string, string> = {};
  for (const r of nodeRecords) {
    organizationIdByNode[r.node_id] = r.organization_id;
  }
  const nodeTrustIndices = computeTrustIndices(
    params.nodeMetadata,
    params.trustScores,
    params.slaConsensus ?? null,
    attestationResults,
    organizationIdByNode
  );
  const trustProof = generateTrustProof(nodeTrustIndices, attestationResults, timestamp);
  return buildFederatedTrustReport(nodeTrustIndices, attestationResults, trustProof);
}
