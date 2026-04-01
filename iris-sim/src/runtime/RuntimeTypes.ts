/**
 * S-0 — Deterministic runtime type definitions.
 */

import type { ClockSnapshot } from '../core-time/ClockSnapshot.js';
import type { SerializedClockSnapshotData } from '../core-time/ClockTypes.js';
import type { SchedulerSnapshot } from '../scheduler/SchedulerTypes.js';
import type { RNGState } from '../deterministic-rng/RNGTypes.js';
import type { TraceExport } from '../trace-engine/TraceTypes.js';

export interface RuntimeSnapshot {
  readonly clock: ClockSnapshot | SerializedClockSnapshotData;
  readonly scheduler: SchedulerSnapshot;
  readonly rng: RNGState;
  readonly trace: TraceExport;
}
