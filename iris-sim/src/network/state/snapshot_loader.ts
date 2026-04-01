/**
 * Phase 14B — Snapshot Engine. Restore state from snapshot.
 */

import type { NetworkState } from './network_state.js';
import type { StateSnapshot } from './snapshot_types.js';
import { SnapshotValidator } from './snapshot_validator.js';
import { SnapshotCompressor } from './snapshot_compressor.js';
import { StateSerializer } from './state_serializer.js';
import { SnapshotError, SnapshotErrorCode } from './snapshot_errors.js';

export class SnapshotLoader {
  /**
   * Restore NetworkState from snapshot. Validates, decompresses if needed, deserializes, verifies hash.
   * Throws SnapshotError if corrupted or invalid.
   */
  static restore(snapshot: StateSnapshot): NetworkState {
    SnapshotValidator.validate(snapshot);

    let payload = snapshot.payload;
    if (snapshot.compressed) {
      try {
        payload = SnapshotCompressor.decompress(snapshot.payload);
      } catch (e) {
        throw new SnapshotError(
          SnapshotErrorCode.INVALID_PAYLOAD,
          'Failed to decompress payload: ' + (e instanceof Error ? e.message : String(e))
        );
      }
    }

    let state: NetworkState;
    try {
      state = StateSerializer.deserialize(payload);
    } catch (e) {
      throw new SnapshotError(
        SnapshotErrorCode.INVALID_PAYLOAD,
        'Failed to deserialize payload: ' + (e instanceof Error ? e.message : String(e))
      );
    }

    SnapshotValidator.validatePayloadHash(snapshot, state);
    return state;
  }
}
