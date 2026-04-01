/**
 * Phase 14B — Snapshot Engine. Snapshot verification.
 */

import type { StateSnapshot } from './snapshot_types.js';
import { SnapshotID } from './snapshot_id.js';
import { SnapshotError, SnapshotErrorCode } from './snapshot_errors.js';
import { computeStateHash } from './state_hash.js';
import type { NetworkState } from './network_state.js';

function isVectorClockFormat(vc: unknown): vc is Record<string, number> {
  if (vc == null || typeof vc !== 'object') return false;
  for (const k of Object.keys(vc as Record<string, unknown>)) {
    const v = (vc as Record<string, unknown>)[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) return false;
  }
  return true;
}

export class SnapshotValidator {
  /**
   * Validate snapshot. Throws SnapshotError if invalid.
   */
  static validate(snapshot: StateSnapshot): boolean {
    if (snapshot == null || typeof snapshot !== 'object') {
      throw new SnapshotError(SnapshotErrorCode.INVALID_SNAPSHOT, 'Snapshot is null or not an object');
    }
    if (typeof snapshot.snapshot_id !== 'string' || snapshot.snapshot_id.length === 0) {
      throw new SnapshotError(SnapshotErrorCode.INVALID_SNAPSHOT, 'Invalid snapshot_id');
    }
    const expectedId = SnapshotID.generate(
      snapshot.state_hash_root.global_hash,
      snapshot.author_node,
      snapshot.created_at
    );
    if (snapshot.snapshot_id !== expectedId) {
      throw new SnapshotError(SnapshotErrorCode.INVALID_SNAPSHOT, 'snapshot_id integrity check failed');
    }
    if (snapshot.state_hash_root == null || typeof snapshot.state_hash_root.global_hash !== 'string') {
      throw new SnapshotError(SnapshotErrorCode.INVALID_SNAPSHOT, 'Invalid state_hash_root');
    }
    if (!isVectorClockFormat(snapshot.vector_clock)) {
      throw new SnapshotError(SnapshotErrorCode.INVALID_VECTOR_CLOCK, 'Invalid vector_clock format');
    }
    if (typeof snapshot.payload !== 'string') {
      throw new SnapshotError(SnapshotErrorCode.INVALID_PAYLOAD, 'Invalid payload');
    }
    if (typeof snapshot.compressed !== 'boolean') {
      throw new SnapshotError(SnapshotErrorCode.INVALID_SNAPSHOT, 'Invalid compressed flag');
    }
    if (snapshot.signature != null && typeof snapshot.signature === 'string') {
      // Signature presence is optional; full verification requires public_key (done in loader or caller)
    }
    return true;
  }

  /**
   * Verify that decompressed and deserialized payload hashes match state_hash_root.
   */
  static validatePayloadHash(snapshot: StateSnapshot, restoredState: NetworkState): boolean {
    const computed = computeStateHash(restoredState);
    if (computed.global_hash !== snapshot.state_hash_root.global_hash) {
      throw new SnapshotError(SnapshotErrorCode.HASH_MISMATCH, 'Payload hash does not match state_hash_root');
    }
    return true;
  }
}
