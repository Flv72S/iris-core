import type { ConsensusProposal, ConsensusResult } from '../consensus/index.js';
import type { ConsensusLogEntry } from '../consensus_log/index.js';
import { ConsensusLogEntryType } from '../consensus_log/index.js';
import { ReplayStateBuilder } from './replay_state_builder.js';

function isConsensusProposal(p: unknown): p is ConsensusProposal {
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof (p as ConsensusProposal).proposal_id === 'string' &&
    typeof (p as ConsensusProposal).diff_hash === 'string'
  );
}

function isConsensusResult(r: unknown): r is ConsensusResult {
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof (r as ConsensusResult).proposal_id === 'string' &&
    typeof (r as ConsensusResult).accepted === 'boolean'
  );
}

export class ReplayExecutor {
  static execute(entries: ConsensusLogEntry[]): ReplayStateBuilder {
    // Build a proposal_id -> expected_state_hash map from PROPOSAL_CREATED entries.
    const proposalHash = new Map<string, string>();
    for (const entry of entries) {
      if (entry.type !== ConsensusLogEntryType.PROPOSAL_CREATED) continue;
      if (!isConsensusProposal(entry.payload)) continue;
      proposalHash.set(entry.payload.proposal_id, entry.payload.diff_hash);
    }

    const builder = new ReplayStateBuilder();

    // Apply only CONSENSUS_REACHED, per spec.
    for (const entry of entries) {
      if (entry.type !== ConsensusLogEntryType.CONSENSUS_REACHED) continue;
      if (!isConsensusResult(entry.payload)) continue;

      const expected = proposalHash.get(entry.payload.proposal_id) ?? null;
      builder.apply(entry.payload, expected);
    }

    return builder;
  }
}

