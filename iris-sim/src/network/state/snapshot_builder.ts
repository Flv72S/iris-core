/**
 * Phase 14B — Snapshot Engine. Build snapshots from state (read-only).
 */

import type { NetworkState } from './network_state.js';
import type { StateSnapshot } from './snapshot_types.js';
import { StateSerializer } from './state_serializer.js';
import { computeStateHash } from './state_hash.js';
import { SnapshotID } from './snapshot_id.js';
import { SnapshotCompressor } from './snapshot_compressor.js';

export class SnapshotBuilder {
  /**
   * Build a deterministic snapshot. Does not mutate state.
   */
  static build(
    state: NetworkState,
    author_node: string,
    timestamp: number,
    compress?: boolean
  ): StateSnapshot {
    const payload = StateSerializer.serialize(state);
    const state_hash_root = computeStateHash(state);
    const global_hash = state_hash_root.global_hash;
    const snapshot_id = SnapshotID.generate(global_hash, author_node, timestamp);

    let finalPayload = payload;
    if (compress) {
      finalPayload = SnapshotCompressor.compress(payload);
    }

    const vector_clock = state.metadata?.vector_clock ?? {};

    return {
      snapshot_id,
      state_hash_root,
      vector_clock: { ...vector_clock },
      author_node,
      created_at: timestamp,
      compressed: compress === true,
      payload: finalPayload,
    };
  }
}
