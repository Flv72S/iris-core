/**
 * Microstep 10L — Governance Consensus Preparation Layer. Consensus preparation engine.
 */

import type { FederationSnapshot } from '../../trust_federation/types/federation_types.js';
import type { GovernanceAttestation, ConsensusContext } from '../types/consensus_types.js';
import { AttestationRegistry } from '../attestation/attestation_registry.js';
import { computeQuorum } from '../quorum/quorum_engine.js';
import { buildGovernanceProof } from '../proof/governance_proof_builder.js';
import { createConsensusProposal } from '../proposal/consensus_proposal_builder.js';
import { buildConsensusContext } from '../context/consensus_context_builder.js';

/**
 * Prepare consensus context from federation snapshot and attestations.
 */
export function prepareConsensusContext(
  federation_snapshot: FederationSnapshot,
  attestations: readonly GovernanceAttestation[],
  timestamp?: number
): ConsensusContext {
  const registry = new AttestationRegistry();
  const snapshot_hash = federation_snapshot.snapshot_hash;
  for (const att of attestations) {
    if (att.snapshot_hash === snapshot_hash) registry.addAttestation(att);
  }
  const collected = registry.getAttestations(snapshot_hash);
  const quorum = computeQuorum(federation_snapshot.graph);
  const proof = buildGovernanceProof(snapshot_hash, collected);
  const proposal = createConsensusProposal(federation_snapshot, proof, timestamp);
  return buildConsensusContext(proposal, quorum);
}
