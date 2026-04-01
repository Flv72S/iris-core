/**
 * Observer adapter for Microstep 14H.
 * Keeps 14F.1 observer interface unchanged while persisting an audit-grade log.
 */

import type { IConsensusObserver, ConsensusProposal, ConsensusResult, ConsensusVote } from '../consensus/index.js';
import { PersistentConsensusLog } from './persistent_consensus_log.js';
import { ConsensusLogEntryType } from './log_types.js';

export class ConsensusLogObserver implements IConsensusObserver {
  constructor(private readonly log: PersistentConsensusLog) {}

  onProposalCreated(proposal: ConsensusProposal): void {
    this.log.append(ConsensusLogEntryType.PROPOSAL_CREATED, proposal);
  }

  onVoteCollected(vote: ConsensusVote): void {
    this.log.append(ConsensusLogEntryType.VOTE_COLLECTED, vote);
  }

  onConsensusReached(result: ConsensusResult): void {
    this.log.append(ConsensusLogEntryType.CONSENSUS_REACHED, result);
  }

  onConsensusFailed(proposal: ConsensusProposal): void {
    this.log.append(ConsensusLogEntryType.CONSENSUS_FAILED, proposal);
  }
}

