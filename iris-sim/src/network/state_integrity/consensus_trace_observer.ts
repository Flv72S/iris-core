/**
 * Microstep 14G — State Integrity Verification. Observer → trace store adapter.
 * Keeps consensus module decoupled from integrity verification.
 */

import type { IConsensusObserver, ConsensusProposal, ConsensusResult, ConsensusVote } from '../consensus/index.js';
import { ConsensusTraceStore } from './consensus_trace_store.js';

export class ConsensusTraceObserver implements IConsensusObserver {
  constructor(private readonly store: ConsensusTraceStore) {}

  onProposalCreated(proposal: ConsensusProposal): void {
    this.store.registerProposal(proposal);
  }

  onVoteCollected(vote: ConsensusVote): void {
    this.store.registerVote(vote);
  }

  onConsensusReached(result: ConsensusResult): void {
    this.store.registerResult(result);
  }

  onConsensusFailed(_proposal: ConsensusProposal): void {
    // Optional: track failures if needed; kept as no-op for deterministic storage.
  }
}

