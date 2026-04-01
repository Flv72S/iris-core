/**
 * Microstep 10L — Governance Consensus Preparation Layer. Consensus proposal builder.
 */

import { createHash } from 'node:crypto';
import type { FederationSnapshot } from '../../trust_federation/types/federation_types.js';
import type { GovernanceProof, ConsensusProposal } from '../types/consensus_types.js';

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Create consensus proposal; proposal_id is deterministic from snapshot_hash, proof_hash, timestamp.
 */
export function createConsensusProposal(
  federation_snapshot: FederationSnapshot,
  proof: GovernanceProof,
  timestamp?: number
): ConsensusProposal {
  const federation_snapshot_hash = federation_snapshot.snapshot_hash;
  const ts = timestamp ?? federation_snapshot.timestamp;
  const proposal_id = sha256(
    `proposal:snapshot=${federation_snapshot_hash}|proof=${proof.proof_hash}|ts=${ts}`
  );
  return Object.freeze({
    proposal_id,
    federation_snapshot_hash,
    proof,
    timestamp: ts,
  });
}
