/**
 * S-2 — Timing manipulation: record skew period. Actual latency skew would require network hook.
 */

import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';

export interface TimingManipulationParams {
  readonly skewFactor: number;
  readonly durationTicks: bigint;
}

export function scheduleTimingManipulation(
  engine: GlobalSimulationEngine,
  atTick: bigint,
  _params: TimingManipulationParams,
  eventIdPrefix: string,
): void {
  engine.scheduleEvent(atTick, eventIdPrefix + ':timing:start:' + String(atTick), () => {
  });
}
