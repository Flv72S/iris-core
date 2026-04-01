/**
 * S-0 — Immutable, serializable, hashable clock snapshot.
 */

import type { ClockSnapshotData, SerializedClockSnapshotData } from './ClockTypes.js';

export class ClockSnapshot implements ClockSnapshotData {
  readonly tick: bigint;
  readonly epoch: bigint;
  readonly frozenState: boolean;

  constructor(data: ClockSnapshotData | SerializedClockSnapshotData) {
    this.tick = BigInt(data.tick);
    this.epoch = BigInt(data.epoch);
    this.frozenState = Boolean(data.frozenState);
  }

  /** Serializable for hashing and persistence. */
  toJSON(): SerializedClockSnapshotData {
    return {
      tick: String(this.tick),
      epoch: String(this.epoch),
      frozenState: this.frozenState,
    };
  }

  static fromJSON(data: ClockSnapshotData | SerializedClockSnapshotData): ClockSnapshot {
    return new ClockSnapshot({
      tick: BigInt(data.tick),
      epoch: BigInt(data.epoch),
      frozenState: Boolean(data.frozenState),
    });
  }
}
