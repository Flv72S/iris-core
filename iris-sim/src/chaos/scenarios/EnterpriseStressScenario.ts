/**
 * S-2 — Enterprise stress scenario: 10 clusters, 50 nodes, 100k+ messages, overlapping attacks.
 */

import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';
import type { ChaosEngine } from '../engine/ChaosEngine.js';
import { ChaosScenarioBuilder } from './ChaosScenarioBuilder.js';

export function buildEnterpriseStressTopology(engine: GlobalSimulationEngine): void {
  for (let c = 1; c <= 10; c++) {
    engine.createCluster('c' + c);
  }
  for (let c = 1; c <= 10; c++) {
    for (let n = 0; n < 50; n++) {
      engine.createNode('c' + c + '-n' + n, 'c' + c);
    }
  }
}

export function buildEnterpriseStressChaos(chaosEngine: ChaosEngine): void {
  const builder = new ChaosScenarioBuilder(chaosEngine);
  builder.addCrashStorm(600n, 10);
  builder.addPartitionFlap(600n, 300n, 50n, 'c1', 'c2');
  builder.addPartitionFlap(600n, 300n, 50n, 'c3', 'c4');
  builder.addByzantineSwarm(700n, 5);
  const fromNodes: string[] = [];
  const toNodes: string[] = [];
  for (let c = 1; c <= 10; c++) {
    fromNodes.push('c' + c + '-n0');
    toNodes.push('c' + (c % 10 + 1) + '-n1');
  }
  builder.addFlood(800n, fromNodes, toNodes, 20);
  builder.addSplitBrain(1000n, 200n, ['c1', 'c2', 'c3', 'c4', 'c5'], ['c6', 'c7', 'c8', 'c9', 'c10']);
  builder.addRecoveryStorm(1200n, 15);
  builder.addTimingManipulation(1100n, 2, 100n);
  builder.build();
}

export function scheduleEnterpriseTraffic(engine: GlobalSimulationEngine, messageCount: number): void {
  const clusters = engine.getClusterIds();
  const rng = engine.runtime.rng;
  for (let i = 0; i < messageCount; i++) {
    const c1 = clusters[rng.nextInt(clusters.length)];
    const c2 = clusters[rng.nextInt(clusters.length)];
    const cluster1 = engine.getCluster(c1);
    const cluster2 = engine.getCluster(c2);
    if (!cluster1 || !cluster2) continue;
    const nodes1 = [...cluster1.nodes.keys()];
    const nodes2 = [...cluster2.nodes.keys()];
    if (nodes1.length === 0 || nodes2.length === 0) continue;
    const from = nodes1[rng.nextInt(nodes1.length)];
    const to = nodes2[rng.nextInt(nodes2.length)];
    if (from === to) continue;
    const tick = 1n + BigInt(rng.nextInt(499));
    engine.scheduleEvent(tick, 'stress:traffic:' + String(i) + ':' + String(tick), () => {
      const node = engine.getNode(from);
      if (node && node.isAlive) {
        node.sendMessage(to, { seq: i }, 'stress', engine.runtime.clock.currentTick);
      }
    });
  }
}
