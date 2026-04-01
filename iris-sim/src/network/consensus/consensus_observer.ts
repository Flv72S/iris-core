/**
 * Phase 14F.1 — Consensus Observability Hook.
 * Deterministic, injectable, synchronous observer interface.
 */

import type { ConsensusProposal, ConsensusResult, ConsensusVote } from './consensus_types.js';

export interface IConsensusObserver {
  onProposalCreated(proposal: ConsensusProposal): void;
  onVoteCollected(vote: ConsensusVote): void;
  onConsensusReached(result: ConsensusResult): void;
  onConsensusFailed(proposal: ConsensusProposal): void;
}

export class NoOpConsensusObserver implements IConsensusObserver {
  onProposalCreated(): void {}
  onVoteCollected(): void {}
  onConsensusReached(): void {}
  onConsensusFailed(): void {}
}

