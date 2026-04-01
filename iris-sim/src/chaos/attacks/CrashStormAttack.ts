/**
 * S-2 — Crash storm: crash N% of nodes simultaneously. Deterministic selection via RNG.
 */

import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';

export interface CrashStormParams {
  readonly intensityPercent: number;
  readonly clusterIds?: readonly string[];
}

export function scheduleCrashStorm(
  engine: GlobalSimulationEngine,
  atTick: bigint,
  params: CrashStormParams,
  rng: { nextInt: (n: number) => number },
  eventIdPrefix: string,
): void {
  const clusters = params.clusterIds ?? [...engine.getClusterIds()];
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
  const toCrash = allNodes.slice(0, k);
  engine.scheduleEvent(atTick, eventIdPrefix + ':crashstorm:' + String(atTick), () => {
    for (const nodeId of toCrash) {
      const node = engine.getNode(nodeId);
      if (node) node.crash();
    }
  });
}
