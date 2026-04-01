/**
 * Phase 14F — Consensus Coordination Layer. Types.
 */

export interface ConsensusProposal {
  readonly proposal_id: string;
  readonly author_node: string;
  readonly state_version: number;
  readonly diff_hash: string;
  readonly created_at: number;
}

export interface ConsensusVote {
  readonly node_id: string;
  readonly proposal_id: string;
  readonly accepted: boolean;
  readonly timestamp: number;
}

export interface ConsensusResult {
  readonly proposal_id: string;
  readonly accepted: boolean;
  readonly quorum_reached: boolean;
  readonly total_votes: number;
}

