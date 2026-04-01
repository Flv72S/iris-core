/**
 * Microstep 14G — State Integrity Verification. Consensus trace store.
 * Collects lifecycle events from consensus observer (14F.1).
 */

import type { ConsensusProposal, ConsensusResult, ConsensusVote } from '../consensus/index.js';

export interface ConsensusTrace {
  readonly proposal_id: string;
  proposal: ConsensusProposal;
  votes: ConsensusVote[];
  result?: ConsensusResult | undefined;
}

export class ConsensusTraceStore {
  private readonly traces = new Map<string, ConsensusTrace>();

  registerProposal(proposal: ConsensusProposal): void {
    const id = proposal.proposal_id;
    const existing = this.traces.get(id);
    if (existing) {
      existing.proposal = proposal;
      return;
    }
    this.traces.set(id, { proposal_id: id, proposal, votes: [] });
  }

  registerVote(vote: ConsensusVote): void {
    const id = vote.proposal_id;
    const trace = this.traces.get(id);
    if (!trace) {
      // Create trace lazily so vote-first ordering is still traceable.
      this.traces.set(id, { proposal_id: id, proposal: (null as unknown) as ConsensusProposal, votes: [vote] });
      return;
    }
    trace.votes.push(vote);
  }

  registerResult(result: ConsensusResult): void {
    const id = result.proposal_id;
    const trace = this.traces.get(id);
    if (!trace) {
      this.traces.set(id, {
        proposal_id: id,
        proposal: (null as unknown) as ConsensusProposal,
        votes: [],
        result,
      });
      return;
    }
    trace.result = result;
  }

  getTrace(proposal_id: string): ConsensusTrace | undefined {
    return this.traces.get(proposal_id);
  }

  getAllTraces(): ConsensusTrace[] {
    return [...this.traces.values()];
  }
}

