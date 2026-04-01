/**
 * Microstep 10L — Governance Consensus Preparation Layer. Types.
 */

export interface GovernanceAttestation {
  readonly node_id: string;
  readonly snapshot_hash: string;
  readonly timestamp: number;
}

export interface QuorumDefinition {
  readonly required_nodes: number;
  readonly trust_threshold: number;
}

export interface GovernanceProof {
  readonly snapshot_hash: string;
  readonly attestations: readonly GovernanceAttestation[];
  readonly proof_hash: string;
}

export interface ConsensusProposal {
  readonly proposal_id: string;
  readonly federation_snapshot_hash: string;
  readonly proof: GovernanceProof;
  readonly timestamp: number;
}

export interface ConsensusContext {
  readonly proposal: ConsensusProposal;
  readonly quorum: QuorumDefinition;
}
