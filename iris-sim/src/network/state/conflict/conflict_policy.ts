/**
 * Phase 14D — Conflict Resolution Engine. Deterministic resolution rules.
 */

import type { StateConflict, ConflictResolutionResult } from './conflict_types.js';

/**
 * Resolution order: 1) Governance priority, 2) Vector clock (higher version), 3) Latest timestamp, 4) Local priority.
 */
export class ConflictPolicy {
  static resolve(conflict: StateConflict): ConflictResolutionResult {
    if (conflict.entity_type === 'GOVERNANCE') {
      return {
        resolved_value: conflict.local_version >= conflict.remote_version ? conflict.local_value : conflict.remote_value,
        resolution_strategy: 'governance_priority',
      };
    }
    if (conflict.local_version > conflict.remote_version) {
      return { resolved_value: conflict.local_value, resolution_strategy: 'vector_clock_priority' };
    }
    if (conflict.remote_version > conflict.local_version) {
      return { resolved_value: conflict.remote_value, resolution_strategy: 'vector_clock_priority' };
    }
    const localTs = conflict.local_timestamp ?? 0;
    const remoteTs = conflict.remote_timestamp ?? 0;
    if (remoteTs > localTs) {
      return { resolved_value: conflict.remote_value, resolution_strategy: 'latest_timestamp' };
    }
    return { resolved_value: conflict.local_value, resolution_strategy: 'local_priority' };
  }
}
