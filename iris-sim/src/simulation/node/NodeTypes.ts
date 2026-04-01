/**
 * S-1 — Simulated node type definitions.
 */

export type BehaviorProfile = 'honest' | 'byzantine';

export interface NodeState {
  readonly [key: string]: unknown;
}

export interface SimulatedMessage {
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly payload: unknown;
  readonly tickSent: bigint;
  readonly messageId: string;
  readonly messageType: string;
}
