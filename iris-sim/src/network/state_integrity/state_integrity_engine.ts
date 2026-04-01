/**
 * Microstep 14G — State Integrity Verification. Engine.
 */

import type { NetworkState } from '../state/index.js';
import { computeStateHash } from '../state/index.js';
import type { ConsensusTraceStore } from './consensus_trace_store.js';
import type { StateIntegrityReport } from './integrity_types.js';
import { StateIntegrityValidator } from './state_integrity_validator.js';

export class StateIntegrityEngine {
  static verify(state: NetworkState, traceStore: ConsensusTraceStore): StateIntegrityReport {
    const violations = StateIntegrityValidator.validateState(state, traceStore);
    const state_hash = computeStateHash(state).global_hash;
    return {
      state_hash,
      valid: violations.length === 0,
      violations,
      checked_at: Date.now(),
    };
  }
}

