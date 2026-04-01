/**
 * S-0 — Execution trace type definitions.
 */

export interface TraceEntry {
  readonly tick: string;
  readonly eventId: string;
  readonly executionOrderIndex: number;
  readonly rngStateHash: string;
  readonly clockSnapshotHash: string;
}

export interface TraceExport {
  readonly entries: readonly TraceEntry[];
  readonly executionHash: string | null;
}
