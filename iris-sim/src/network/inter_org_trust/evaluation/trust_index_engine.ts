/**
 * Phase 11D / 11D.1 — Trust Index Engine.
 * Multi-component trust: declared (0.5) + observed (0.3) + verified (0.2).
 * Deterministic, normalized [0,1], no self-declared influence alone.
 */

import type { NodeTrustScore } from '../../cross_tenant_sla/trust/sla_trust_types.js';
import type { SLAConsensusCheckResult } from '../../cross_tenant_sla/verification/sla_consensus_types.js';
import type { CertificateAttestationResult } from '../types/trust_types.js';
import type { NodeTrustIndex, TrustLevel } from '../types/trust_types.js';

/** Weights for multi-component model (Phase 11D.1). */
const WEIGHT_DECLARED = 0.5;
const WEIGHT_OBSERVED = 0.3;
const WEIGHT_VERIFIED = 0.2;

/** Declared trust when node has no NodeTrustScore. */
const DECLARED_TRUST_WHEN_MISSING = 0.5;

/** Observed trust constants (from SLAConsensusCheckResult). */
const OBSERVED_TRUST_IN_GOOD_STANDING = 1;
const OBSERVED_TRUST_MISSING_SLA = 0.25;
const OBSERVED_TRUST_OUTSIDE_CONSENSUS = 0.1;
const OBSERVED_TRUST_NO_CONSENSUS = 0.75;

/** Verified trust constants (from CertificateAttestationResult). */
const VERIFIED_TRUST_FULL = 1;
const VERIFIED_TRUST_ANCHOR_INVALID = 0.4;
const VERIFIED_TRUST_INVALID = 0;
const VERIFIED_TRUST_NO_ATTESTATION = 0.5;

/** Trust level thresholds. */
const THRESHOLD_HIGH = 0.8;
const THRESHOLD_MEDIUM = 0.6;
const THRESHOLD_LOW = 0.3;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function trustLevelFromIndex(trust_index: number): TrustLevel {
  if (trust_index >= THRESHOLD_HIGH) return 'HIGH';
  if (trust_index >= THRESHOLD_MEDIUM) return 'MEDIUM';
  if (trust_index >= THRESHOLD_LOW) return 'LOW';
  return 'UNTRUSTED';
}

/**
 * Compute declared trust for a node (from NodeTrustScore). Normalized [0,1].
 * Missing score → DECLARED_TRUST_WHEN_MISSING.
 */
export function computeDeclaredTrust(nodeId: string, trustScores: readonly NodeTrustScore[]): number {
  const s = trustScores.find((x) => x.node_id === nodeId);
  if (s === undefined) return DECLARED_TRUST_WHEN_MISSING;
  return clamp01(s.trust_score);
}

/**
 * Compute observed trust from SLA consensus verification.
 * No SLAConsensusCheckResult → OBSERVED_TRUST_NO_CONSENSUS.
 */
export function computeObservedTrust(nodeId: string, slaConsensus: SLAConsensusCheckResult | null): number {
  if (slaConsensus === null) return OBSERVED_TRUST_NO_CONSENSUS;
  if (slaConsensus.nodes_outside_consensus.includes(nodeId)) return OBSERVED_TRUST_OUTSIDE_CONSENSUS;
  if (slaConsensus.nodes_missing_sla.includes(nodeId)) return OBSERVED_TRUST_MISSING_SLA;
  return OBSERVED_TRUST_IN_GOOD_STANDING;
}

/**
 * Compute verified trust from certificate attestation results.
 * No attestation for node → VERIFIED_TRUST_NO_ATTESTATION.
 */
export function computeVerifiedTrust(nodeId: string, attestationResults: readonly CertificateAttestationResult[]): number {
  const a = attestationResults.find((x) => x.node_id === nodeId);
  if (a === undefined) return VERIFIED_TRUST_NO_ATTESTATION;
  if (!a.certificate_valid) return VERIFIED_TRUST_INVALID;
  if (!a.trust_anchor_associated) return VERIFIED_TRUST_ANCHOR_INVALID;
  return VERIFIED_TRUST_FULL;
}

/**
 * Compute deterministic trust indices for all nodes in metadata.
 * Uses multi-component formula; output sorted lexicographically by node_id.
 */
export function computeTrustIndices(
  metadata: readonly { readonly node_id: string }[],
  trustScores: readonly NodeTrustScore[],
  slaConsensus: SLAConsensusCheckResult | null,
  attestationResults: readonly CertificateAttestationResult[] = [],
  organizationIdByNode: Readonly<Record<string, string>> = {}
): NodeTrustIndex[] {
  const nodeIds = [...metadata.map((m) => m.node_id)].sort((a, b) => a.localeCompare(b));

  const result: NodeTrustIndex[] = nodeIds.map((node_id) => {
    const organization_id = organizationIdByNode[node_id] ?? '';
    const declared_trust = computeDeclaredTrust(node_id, trustScores);
    const observed_trust = computeObservedTrust(node_id, slaConsensus);
    const verified_trust = computeVerifiedTrust(node_id, attestationResults);
    const trust_index = clamp01(
      WEIGHT_DECLARED * declared_trust + WEIGHT_OBSERVED * observed_trust + WEIGHT_VERIFIED * verified_trust
    );
    const trust_level = trustLevelFromIndex(trust_index);
    return Object.freeze({
      node_id,
      organization_id,
      declared_trust,
      observed_trust,
      verified_trust,
      trust_index,
      trust_level,
    });
  });

  return result;
}
