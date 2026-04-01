import type { ReplayError } from './replay_errors.js';

/**
 * In 14I, "DistributedState" is the deterministically reconstructed state derived from
 * audit-grade consensus events alone.
 *
 * Note: the Phase 14F consensus types do not carry a full state diff/payload; therefore
 * this replay state focuses on verifiable consensus outcomes and their implied state hashes.
 */
export interface DistributedState {
  /** Ordered accepted proposal ids (derived from CONSENSUS_REACHED where accepted=true). */
  readonly accepted_proposals: readonly string[];
  /** Latest accepted proposal id, if any. */
  readonly last_accepted_proposal_id: string | null;
  /** Latest expected state hash (derived from proposal.diff_hash), if available. */
  readonly last_expected_state_hash: string | null;
}

export interface ReplayResult {
  final_state: DistributedState;
  final_hash: string;
  expected_hash?: string;
  valid: boolean;
  errors: ReplayError[];
}

