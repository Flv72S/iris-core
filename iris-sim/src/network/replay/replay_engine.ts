import type { ConsensusLogEntry } from '../consensus_log/index.js';
import { ConsensusLogEntryType } from '../consensus_log/index.js';
import { ReplayExecutor } from './replay_executor.js';
import { ReplayErrorType, type ReplayError } from './replay_errors.js';
import { ReplayValidator } from './replay_validator.js';
import type { ReplayResult } from './replay_types.js';

function lastExpectedHashFromEntries(entries: ConsensusLogEntry[]): string | undefined {
  // Spec wants expected hash from last CONSENSUS_REACHED.result.state_hash.
  // Phase 14F ConsensusResult lacks state_hash, so we derive expected_hash from the
  // latest PROPOSAL_CREATED.diff_hash for the last accepted CONSENSUS_REACHED.
  const proposalDiffHash = new Map<string, string>();
  for (const e of entries) {
    if (e.type !== ConsensusLogEntryType.PROPOSAL_CREATED) continue;
    const p = e.payload as { proposal_id?: unknown; diff_hash?: unknown } | null;
    if (!p || typeof p.proposal_id !== 'string' || typeof p.diff_hash !== 'string') continue;
    proposalDiffHash.set(p.proposal_id, p.diff_hash);
  }

  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]!;
    if (e.type !== ConsensusLogEntryType.CONSENSUS_REACHED) continue;
    const r = e.payload as { proposal_id?: unknown; accepted?: unknown } | null;
    if (!r || typeof r.proposal_id !== 'string' || r.accepted !== true) continue;
    return proposalDiffHash.get(r.proposal_id);
  }
  return undefined;
}

export class ReplayEngine {
  static replay(log: ConsensusLogEntry[]): ReplayResult {
    const errors: ReplayError[] = [];

    // 1) validate log integrity (hash chain)
    try {
      ReplayValidator.validateHashChain(log);
    } catch (e) {
      errors.push({
        type: ReplayErrorType.INVALID_HASH_CHAIN,
        message: (e as Error).message,
      });
      return {
        final_state: Object.freeze({
          accepted_proposals: Object.freeze([]),
          last_accepted_proposal_id: null,
          last_expected_state_hash: null,
        }),
        final_hash: '',
        valid: false,
        errors,
      };
    }

    // 2) order preservation: prefer natural order; if entries are out-of-order, replay uses given order.
    // 3) execute events sequentially and rebuild state
    const builder = ReplayExecutor.execute(log);
    const final_state = builder.getState();

    // 4) compute final hash
    const final_hash = ReplayValidator.computeFinalHash(final_state);

    // 5) expected hash (best-effort from log contents)
    const expected_hash = lastExpectedHashFromEntries(log);

    // 6) compare with expected consensus result (if present)
    if (expected_hash == null) {
      errors.push({
        type: ReplayErrorType.MISSING_EVENT,
        message: 'Missing expected hash for last accepted consensus result (no matching proposal diff_hash found).',
      });
    } else if (final_hash !== expected_hash) {
      errors.push({
        type: ReplayErrorType.STATE_MISMATCH,
        message: `Final state hash mismatch: expected ${expected_hash}, got ${final_hash}`,
      });
    }

    return {
      final_state,
      final_hash,
      ...(expected_hash != null ? { expected_hash } : {}),
      valid: errors.length === 0,
      errors,
    };
  }
}

