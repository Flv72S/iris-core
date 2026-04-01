/**
 * Phase 11G — Trust Proof Verifier.
 * Recomputes proof hash from payload and compares. Read-only.
 */

import { createHash } from 'node:crypto';
import type { TrustProof } from '../inter_org_trust/types/trust_types.js';
import type { NodeTrustIndex } from '../inter_org_trust/types/trust_types.js';
import type { CertificateAttestationResult } from '../inter_org_trust/types/trust_types.js';
import type { AuditStatus } from './audit_types.js';

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
 * Verify trust proof by recomputing hash from the same payload as the generator.
 * FAIL if hash mismatch; PASS if valid.
 */
export function verifyTrustProof(
  proof: TrustProof,
  node_trust_indices: readonly NodeTrustIndex[],
  attestation_results: readonly CertificateAttestationResult[]
): AuditStatus {
  const payload = {
    timestamp: proof.timestamp,
    evaluated_nodes: proof.evaluated_nodes,
    trust_summary: proof.trust_summary,
    node_trust_indices,
    attestation_results,
  };
  const expectedHash = sha256Hex(stableStringify(payload));
  return expectedHash === proof.trust_hash ? 'PASS' : 'FAIL';
}
