/**
 * S-2 — Split brain: partition two halves of clusters, then heal after duration.
 */

import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';

export interface SplitBrainParams {
  readonly leftClusterIds: readonly string[];
  readonly rightClusterIds: readonly string[];
  readonly durationTicks: bigint;
}

export function scheduleSplitBrain(
  engine: GlobalSimulationEngine,
  atTick: bigint,
  params: SplitBrainParams,
  eventIdPrefix: string,
): void {
  const pm = engine.getPartitionManager();
  if (!pm) return;
  const leftStr = params.leftClusterIds.join(',');
  const rightStr = params.rightClusterIds.join(',');
  engine.scheduleEvent(atTick, eventIdPrefix + ':splitbrain:part:' + String(atTick) + ':' + leftStr + ':' + rightStr, () => {
    for (const a of params.leftClusterIds) {
      for (const b of params.rightClusterIds) {
        pm.partition(a, b);
      }
    }
  });
  const healTick = atTick + params.durationTicks;
  engine.scheduleEvent(healTick, eventIdPrefix + ':splitbrain:heal:' + String(healTick) + ':' + leftStr + ':' + rightStr, () => {
    for (const a of params.leftClusterIds) {
      for (const b of params.rightClusterIds) {
        pm.heal(a, b);
      }
    }
  });
}
