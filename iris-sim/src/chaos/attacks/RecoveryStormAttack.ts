/**
 * S-2 — Recovery storm: recover large subsets. Deterministic selection.
 */

import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';

export interface RecoveryStormParams {
  readonly intensityPercent: number;
  readonly clusterIds?: readonly string[];
}

export function scheduleRecoveryStorm(
  engine: GlobalSimulationEngine,
  atTick: bigint,
  params: RecoveryStormParams,
  rng: { nextInt: (n: number) => number },
  eventIdPrefix: string,
): void {
  const clusters = params.clusterIds ?? engine.getClusterIds();
  const allNodes: string[] = [];
  for (const cid of clusters) {
    const c = engine.getCluster(cid);
    if (c) for (const n of c.nodes.keys()) allNodes.push(n);
  }
  const k = Math.max(0, Math.min(allNodes.length, Math.floor((allNodes.length * params.intensityPercent) / 100)));
  for (let i = 0; i < k; i++) {
    const idx = i + (allNodes.length - i > 1 ? rng.nextInt(allNodes.length - i) : 0);
    const t = allNodes[i];
    allNodes[i] = allNodes[idx];
    allNodes[idx] = t;
  }
  const toRecover = allNodes.slice(0, k);
  engine.scheduleEvent(atTick, eventIdPrefix + ':recoverstorm:' + String(atTick), () => {
    for (const nodeId of toRecover) {
      const node = engine.getNode(nodeId);
      if (node) node.recover();
    }
  });
}
