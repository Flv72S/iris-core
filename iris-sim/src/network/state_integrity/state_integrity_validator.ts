/**
 * Microstep 14G — State Integrity Verification. Validator.
 *
 * Uses:
 * - current NetworkState
 * - ConsensusTraceStore (from observer logs)
 *
 * Notes:
 * - Consensus types do not include state_hash; we treat ConsensusProposal.diff_hash as the expected state hash.
 */

import type { NetworkState } from '../state/index.js';
import { computeStateHash } from '../state/index.js';
import type { ConsensusTraceStore, ConsensusTrace } from './consensus_trace_store.js';
import { IntegrityViolationType, type IntegrityViolation } from './integrity_types.js';

function violation(type: IntegrityViolationType, description: string, related_id?: string): IntegrityViolation {
  return { type, description, ...(related_id !== undefined && { related_id }) };
}

function isAcceptedTrace(t: ConsensusTrace): boolean {
  return Boolean(t.result && t.result.quorum_reached && t.result.accepted);
}

export class StateIntegrityValidator {
  static validateState(state: NetworkState, traceStore: ConsensusTraceStore): IntegrityViolation[] {
    const violations: IntegrityViolation[] = [];
    const state_hash = computeStateHash(state).global_hash;
    const version = state.metadata.version;

    const traces = traceStore.getAllTraces();
    const tracesWithProposal = traces.filter((t) => (t as { proposal?: unknown }).proposal != null);

    // INCOMPLETE_TRACE: proposal exists but no votes or no result (or proposal missing due to vote-first)
    for (const t of traces) {
      if ((t as { proposal?: unknown }).proposal == null) {
        violations.push(
          violation(IntegrityViolationType.INCOMPLETE_TRACE, 'Trace missing proposal', t.proposal_id)
        );
        continue;
      }
      if (!t.result) {
        violations.push(
          violation(IntegrityViolationType.INCOMPLETE_TRACE, 'Trace missing consensus result', t.proposal_id)
        );
      }
      if (!t.votes || t.votes.length === 0) {
        violations.push(
          violation(IntegrityViolationType.INCOMPLETE_TRACE, 'Trace missing votes', t.proposal_id)
        );
      }
    }

    // Accepted traces for the current version
    const acceptedForVersion = tracesWithProposal
      .filter((t) => t.proposal.state_version === version)
      .filter(isAcceptedTrace);

    // MISSING_CONSENSUS for current state version
    if (version > 0 && acceptedForVersion.length === 0) {
      violations.push(
        violation(
          IntegrityViolationType.MISSING_CONSENSUS,
          `No accepted consensus trace found for state version ${version}`
        )
      );
    }

    // FORK_DETECTED: multiple accepted results for the same version
    if (acceptedForVersion.length > 1) {
      violations.push(
        violation(
          IntegrityViolationType.FORK_DETECTED,
          `Multiple accepted consensus results for state version ${version}`
        )
      );
    }

    // STATE_MISMATCH: state_hash differs from expected hash in the accepted proposal (diff_hash)
    if (acceptedForVersion.length === 1) {
      const expected = acceptedForVersion[0].proposal.diff_hash;
      if (expected !== state_hash) {
        violations.push(
          violation(
            IntegrityViolationType.STATE_MISMATCH,
            `State hash mismatch: expected ${expected}, got ${state_hash}`,
            acceptedForVersion[0].proposal.proposal_id
          )
        );
      }
    }

    // INVALID_TRANSITION: state version jumps without accepted consensus for intermediate versions.
    // Require accepted trace for every version in [1..version].
    if (version > 1) {
      const acceptedByVersion = new Map<number, number>();
      for (const t of tracesWithProposal) {
        if (!isAcceptedTrace(t)) continue;
        const v = t.proposal.state_version;
        acceptedByVersion.set(v, (acceptedByVersion.get(v) ?? 0) + 1);
      }
      for (let v = 1; v <= version; v++) {
        if ((acceptedByVersion.get(v) ?? 0) === 0) {
          violations.push(
            violation(
              IntegrityViolationType.INVALID_TRANSITION,
              `Missing accepted consensus for intermediate state version ${v}`
            )
          );
        }
      }
    }

    return violations;
  }
}

