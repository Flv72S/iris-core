/**
 * Phase 14F — Consensus Coordination Layer. Coordinator.
 *
 * This is a lightweight deterministic orchestrator. Networking is provided via an injected transport.
 */

import type { ConsensusProposal, ConsensusResult, ConsensusVote } from './consensus_types.js';
import { ConsensusValidator } from './consensus_validator.js';
import { ConsensusQuorum } from './consensus_quorum.js';
import type { IConsensusObserver } from './consensus_observer.js';
import { NoOpConsensusObserver } from './consensus_observer.js';

export interface ConsensusTransport {
  /** Broadcast proposal to peers (side-effect). */
  broadcastProposal(proposal: ConsensusProposal): Promise<void>;
  /** Collect votes for proposal from peers (read-only). Must be deterministic for same network inputs. */
  collectVotes(proposal_id: string): Promise<ConsensusVote[]>;
  /** Total number of active nodes eligible to vote. */
  getTotalActiveNodes(): Promise<number>;
}

const DEFAULT_TRANSPORT: ConsensusTransport = {
  async broadcastProposal(): Promise<void> {},
  async collectVotes(): Promise<ConsensusVote[]> {
    return [];
  },
  async getTotalActiveNodes(): Promise<number> {
    return 1;
  },
};

export class ConsensusCoordinator {
  constructor(
    private readonly transport: ConsensusTransport = DEFAULT_TRANSPORT,
    private readonly observer: IConsensusObserver = new NoOpConsensusObserver()
  ) {}

  async proposeUpdate(proposal: ConsensusProposal): Promise<ConsensusResult> {
    ConsensusValidator.validateProposal(proposal);

    this.observer.onProposalCreated(proposal);

    await this.transport.broadcastProposal(proposal);
    const votes = await this.transport.collectVotes(proposal.proposal_id);
    const total_nodes = await this.transport.getTotalActiveNodes();

    // Deterministic vote processing: sort by node_id then timestamp
    const sortedVotes = [...votes].sort(
      (a, b) => a.node_id.localeCompare(b.node_id) || a.timestamp - b.timestamp
    );

    for (const vote of sortedVotes) {
      this.observer.onVoteCollected(vote);
    }

    const quorum_reached = ConsensusQuorum.hasQuorum(sortedVotes, total_nodes);
    const accepted_votes = sortedVotes.filter((v) => v.accepted).length;
    const rejected_votes = sortedVotes.length - accepted_votes;
    const accepted = quorum_reached && accepted_votes >= rejected_votes;

    const result: ConsensusResult = {
      proposal_id: proposal.proposal_id,
      accepted,
      quorum_reached,
      total_votes: sortedVotes.length,
    };

    if (quorum_reached) this.observer.onConsensusReached(result);
    else this.observer.onConsensusFailed(proposal);

    return result;
  }
}
