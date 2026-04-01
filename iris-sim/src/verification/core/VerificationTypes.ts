/**
 * S-3 — Formal verification type definitions.
 */

import type { TraceEntry } from '../../trace-engine/TraceTypes.js';

export const PropertyType = {
  SAFETY: 'SAFETY',
  LIVENESS: 'LIVENESS',
} as const;

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType];

export const PropertyStatus = {
  PENDING: 'PENDING',
  SATISFIED: 'SATISFIED',
  VIOLATED: 'VIOLATED',
} as const;

export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];

export interface VerificationTickContext {
  readonly tick: bigint;
  readonly entriesAtTick: readonly TraceEntry[];
  readonly allEntriesUpToTick: readonly TraceEntry[];
  readonly getNodeAlive: (nodeId: string) => boolean;
  readonly getNodeCluster: (nodeId: string) => string | undefined;
  readonly isPartitioned: (clusterA: string, clusterB: string) => boolean;
  readonly schedulerSize: number;
}

export interface VerificationFinalContext {
  readonly maxTick: bigint;
  readonly allEntries: readonly TraceEntry[];
  readonly getNodeAlive: (nodeId: string) => boolean;
  readonly getNodeCluster: (nodeId: string) => string | undefined;
  readonly isPartitioned: (clusterA: string, clusterB: string) => boolean;
}

export interface VerifiableProperty {
  readonly id: string;
  readonly description: string;
  readonly type: PropertyType;
  evaluateTick(context: VerificationTickContext): void;
  finalize(context: VerificationFinalContext): void;
  getResult(): PropertyStatus;
}
