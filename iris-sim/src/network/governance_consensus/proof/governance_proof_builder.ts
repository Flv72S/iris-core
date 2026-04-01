/**
 * Microstep 10L — Governance Consensus Preparation Layer. Governance proof builder.
 */

import { createHash } from 'node:crypto';
import type { GovernanceAttestation, GovernanceProof } from '../types/consensus_types.js';

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Build governance proof: attestations sorted by node_id, deterministic proof_hash.
 */
export function buildGovernanceProof(
  snapshot_hash: string,
  attestations: readonly GovernanceAttestation[]
): GovernanceProof {
  const sorted = [...attestations].sort((a, b) =>
    a.node_id < b.node_id ? -1 : a.node_id > b.node_id ? 1 : 0
  );
  const payload = sorted
    .map((a) => `${a.node_id}:${a.snapshot_hash}:${a.timestamp}`)
    .join('|');
  const proof_hash = sha256(`proof:snapshot=${snapshot_hash}|attestations=${payload}`);
  return Object.freeze({
    snapshot_hash,
    attestations: sorted,
    proof_hash,
  });
}
