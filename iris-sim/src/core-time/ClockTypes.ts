/**
 * S-0 — Logical clock type definitions.
 * No dependency on Date or system time.
 */

export type Tick = bigint;
export type Epoch = bigint;

export interface ClockSnapshotData {
  readonly tick: Tick;
  readonly epoch: Epoch;
  readonly frozenState: boolean;
}

/** JSON-safe form (tick/epoch as string) for persistence and restore. */
export interface SerializedClockSnapshotData {
  readonly tick: string | number;
  readonly epoch: string | number;
  readonly frozenState: boolean;
}
