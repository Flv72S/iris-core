/**
 * S-2 — Partition flap. Deterministic interval pattern.
 */

import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';

export interface PartitionFlapParams {
  readonly clusterA: string;
  readonly clusterB: string;
  readonly durationTicks: bigint;
  readonly frequencyTicks: bigint;
}

export function schedulePartitionFlap(
  engine: GlobalSimulationEngine,
  startTick: bigint,
  params: PartitionFlapParams,
  eventIdPrefix: string,
): void {
  const pm = engine.getPartitionManager();
  if (!pm) return;
  let tick = startTick;
  let phase = true;
  while (tick < startTick + params.durationTicks) {
    const t = tick;
    if (phase) {
      engine.scheduleEvent(t, eventIdPrefix + ':flap:part:' + String(t) + ':' + params.clusterA + ':' + params.clusterB, () => pm.partition(params.clusterA, params.clusterB));
    } else {
      engine.scheduleEvent(t, eventIdPrefix + ':flap:heal:' + String(t) + ':' + params.clusterA + ':' + params.clusterB, () => pm.heal(params.clusterA, params.clusterB));
    }
    phase = !phase;
    tick += params.frequencyTicks;
  }
}
