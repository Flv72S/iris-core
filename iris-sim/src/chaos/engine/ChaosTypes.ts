/**
 * S-2 — Chaos engine type definitions.
 */

export type AttackKind =
  | 'crash_storm'
  | 'recovery_storm'
  | 'partition_flap'
  | 'byzantine_swarm'
  | 'message_flood'
  | 'censorship'
  | 'split_brain'
  | 'timing_manipulation';

export interface ScheduledAttack {
  readonly atTick: bigint;
  readonly kind: AttackKind;
  readonly params: Readonly<Record<string, unknown>>;
  readonly eventId: string;
}

export interface ChaosLayerSnapshot {
  readonly tick: string;
  readonly attackCount: number;
  readonly hardViolationCount: number;
  readonly softEventCount: number;
  readonly invariantMonitorSerialized: unknown;
  readonly metricsSnapshot: unknown;
}
