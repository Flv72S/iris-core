/**
 * S-1 — Global simulation engine type definitions.
 */

export interface SimulationSnapshot {
  readonly tick: string;
  readonly clusters: readonly unknown[];
  readonly network: unknown;
  readonly runtimeSnapshot: unknown;
}

export interface SimulationResult {
  readonly finalTick: bigint;
  readonly executionHash: string;
  readonly messagesDelivered: number;
  readonly messagesDropped: number;
}
