/**
 * Phase 11D — Federated Trust Report Builder.
 * Builds audit-grade report with deterministic report_hash.
 */

import { createHash } from 'node:crypto';
import type {
  NodeTrustIndex,
  CertificateAttestationResult,
  TrustProof,
  FederatedTrustReport,
} from '../types/trust_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

/**
 * Compute deterministic report hash from report payload.
 */
export function calculateReportHash(payload: {
  node_trust_indices: readonly NodeTrustIndex[];
  attestation_results: readonly CertificateAttestationResult[];
  trust_proof: TrustProof;
}): string {
  return sha256Hex(stableStringify(payload));
}

/**
 * Build federated trust report with report_hash.
 */
export function buildFederatedTrustReport(
  nodeTrustIndices: readonly NodeTrustIndex[],
  attestationResults: readonly CertificateAttestationResult[],
  trustProof: TrustProof
): FederatedTrustReport {
  const sortedIndices = [...nodeTrustIndices].sort((a, b) => a.node_id.localeCompare(b.node_id));
  const sortedAttestations = [...attestationResults].sort((a, b) => a.node_id.localeCompare(b.node_id));

  const report: FederatedTrustReport = Object.freeze({
    node_trust_indices: sortedIndices,
    attestation_results: sortedAttestations,
    trust_proof: trustProof,
    report_hash: calculateReportHash({
      node_trust_indices: sortedIndices,
      attestation_results: sortedAttestations,
      trust_proof: trustProof,
    }),
  });
  return report;
}

/**
 * Verify report integrity by recomputing report_hash.
 */
export function verifyFederatedTrustReport(report: FederatedTrustReport): boolean {
  const expected = calculateReportHash({
    node_trust_indices: report.node_trust_indices,
    attestation_results: report.attestation_results,
    trust_proof: report.trust_proof,
  });
  return expected === report.report_hash;
}
