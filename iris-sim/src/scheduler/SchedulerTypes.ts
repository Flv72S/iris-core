/**
 * S-0 — Scheduler type definitions.
 */

export interface ScheduledEvent {
  readonly id: string;
  readonly scheduledTick: bigint;
  readonly priority: number;
  readonly execute: () => void;
}

export interface SchedulerSnapshotEvent {
  readonly id: string;
  readonly scheduledTick: string;
  readonly priority: number;
  readonly insertionOrder: number;
}

export interface SchedulerSnapshot {
  readonly events: readonly SchedulerSnapshotEvent[];
  readonly nextInsertionOrder: number;
}
