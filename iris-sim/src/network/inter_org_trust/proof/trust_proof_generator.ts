/**
 * Phase 11D — Trust Proof Generator.
 * Deterministic trust_hash via stableStringify + SHA-256.
 */

import { createHash } from 'node:crypto';
import type { NodeTrustIndex } from '../types/trust_types.js';
import type { CertificateAttestationResult } from '../types/trust_types.js';
import type { TrustProof, TrustSummary } from '../types/trust_types.js';

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
 * Compute trust summary from indices and attestation results (Phase 11D.1).
 * highest_trust_node / lowest_trust_node: deterministic sort by trust_index then node_id.
 */
function computeTrustSummary(
  nodeTrustIndices: readonly NodeTrustIndex[],
  attestationResults: readonly CertificateAttestationResult[]
): TrustSummary {
  const total_nodes = nodeTrustIndices.length;
  const valid_attestation_count = attestationResults.filter((a) => a.valid).length;
  const sum = nodeTrustIndices.reduce((acc, n) => acc + n.trust_index, 0);
  const average_trust_index = total_nodes === 0 ? 0 : sum / total_nodes;
  const sortedByIndex = [...nodeTrustIndices].sort(
    (a, b) => b.trust_index - a.trust_index || a.node_id.localeCompare(b.node_id)
  );
  const highest_trust_node = total_nodes === 0 ? '' : sortedByIndex[0].node_id;
  const sortedLowest = [...nodeTrustIndices].sort(
    (a, b) => a.trust_index - b.trust_index || a.node_id.localeCompare(b.node_id)
  );
  const lowest_trust_node = total_nodes === 0 ? '' : sortedLowest[0].node_id;
  const verified_node_count = valid_attestation_count;
  const untrusted_node_count = nodeTrustIndices.filter((n) => n.trust_level === 'UNTRUSTED').length;
  return Object.freeze({
    total_nodes,
    valid_attestation_count,
    average_trust_index,
    highest_trust_node,
    lowest_trust_node,
    verified_node_count,
    untrusted_node_count,
  });
}

/**
 * Generate deterministic trust proof from trust indices and attestation results.
 */
export function generateTrustProof(
  nodeTrustIndices: readonly NodeTrustIndex[],
  attestationResults: readonly CertificateAttestationResult[],
  timestamp: number
): TrustProof {
  const evaluated_nodes = [...nodeTrustIndices.map((n) => n.node_id)].sort((a, b) => a.localeCompare(b));
  const trust_summary = computeTrustSummary(nodeTrustIndices, attestationResults);

  const payload = {
    timestamp,
    evaluated_nodes,
    trust_summary,
    node_trust_indices: nodeTrustIndices,
    attestation_results: attestationResults,
  };
  const trust_hash = sha256Hex(stableStringify(payload));

  return Object.freeze({
    trust_hash,
    timestamp,
    evaluated_nodes,
    trust_summary,
  });
}
