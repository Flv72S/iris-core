import type { ConsensusResult } from '../consensus/index.js';
import type { DistributedState } from './replay_types.js';

export class ReplayStateBuilder {
  private accepted: string[] = [];
  private lastAccepted: string | null = null;
  private lastExpectedHash: string | null = null;

  apply(result: ConsensusResult, expected_state_hash: string | null): void {
    // Deterministic: depends only on inputs.
    if (result.accepted) {
      this.accepted.push(result.proposal_id);
      this.lastAccepted = result.proposal_id;
      this.lastExpectedHash = expected_state_hash;
    }
  }

  getState(): DistributedState {
    return Object.freeze({
      accepted_proposals: Object.freeze([...this.accepted]),
      last_accepted_proposal_id: this.lastAccepted,
      last_expected_state_hash: this.lastExpectedHash,
    });
  }
}

