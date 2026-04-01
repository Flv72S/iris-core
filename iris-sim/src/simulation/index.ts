/**
 * S-1 — Deterministic Global Simulation Engine. Demo: 3 clusters, 5 nodes each;
 * partition at 100, heal at 200; crash at 150, recover at 250; byzantine at 180.
 * Run twice and verify identical execution hash.
 */

import { createSimulationConfig } from './engine/SimulationConfig.js';
import { GlobalSimulationEngine } from './engine/GlobalSimulationEngine.js';
import { ScenarioBuilder } from './scenarios/ScenarioBuilder.js';

const SEED = 's1-demo-seed';

function buildDemoScenario(engine: GlobalSimulationEngine): void {
  for (let c = 1; c <= 3; c++) {
    engine.createCluster('c' + c);
  }
  for (let c = 1; c <= 3; c++) {
    for (let n = 0; n < 5; n++) {
      engine.createNode('c' + c + '-n' + n, 'c' + c);
    }
  }
  const builder = new ScenarioBuilder(engine);
  builder.injectPartition(100n, 'c1', 'c2');
  builder.injectPartitionHeal(200n, 'c1', 'c2');
  builder.injectNodeCrash(150n, 'c1-n0');
  builder.injectNodeRecover(250n, 'c1-n0');
  builder.injectByzantine(180n, 'c2-n1', 'mutate');
  builder.scheduleTrafficPattern('c1-n0', 'c2-n0', { seq: 1 }, 'ping', 10n);
  builder.scheduleTrafficPattern('c2-n0', 'c1-n1', { seq: 2 }, 'pong', 20n);
  builder.scheduleTrafficPattern('c1-n1', 'c3-n0', { seq: 3 }, 'relay', 30n);
  builder.scheduleTrafficPattern('c3-n0', 'c1-n2', { seq: 4 }, 'ack', 40n);
  builder.build();
}

function runFullSimulation(): string {
  const config = createSimulationConfig({
    numberOfClusters: 3,
    nodesPerCluster: 5,
    baseLatency: 2,
    latencyJitter: 1,
    allowByzantine: true,
    allowPartitions: true,
    maxTicks: 300n,
    deterministicSeed: SEED,
  });
  const engine = new GlobalSimulationEngine(config);
  engine.initialize(SEED);
  buildDemoScenario(engine);
  engine.run();
  const hash = engine.getExecutionHash();
  const result = engine.getResult();
  engine.shutdown();
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write('Execution hash: ' + hash + '\n');
    process.stdout.write('Final tick: ' + String(result.finalTick) + ', delivered: ' + result.messagesDelivered + ', dropped: ' + result.messagesDropped + '\n');
  }
  return hash;
}

function main(): void {
  const hash1 = runFullSimulation();
  const hash2 = runFullSimulation();
  const ok = hash1 === hash2 && hash1.length > 0;
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write('Run 1: ' + hash1 + '\n');
    process.stdout.write('Run 2: ' + hash2 + '\n');
    process.stdout.write('Identical: ' + ok + '\n');
    process.exit(ok ? 0 : 1);
  }
}

main();

export { GlobalSimulationEngine, SimulationEngineError } from './engine/GlobalSimulationEngine.js';
export { createSimulationConfig, type SimulationConfig } from './engine/SimulationConfig.js';
export type { SimulationResult, SimulationSnapshot } from './engine/SimulationTypes.js';
export { SimulatedCluster } from './cluster/SimulatedCluster.js';
export { SimulatedNode } from './node/SimulatedNode.js';
export type { SimulatedMessage, NodeState, BehaviorProfile } from './node/NodeTypes.js';
export { DeterministicNetwork } from './network/DeterministicNetwork.js';
export { NetworkPartitionManager } from './network/NetworkPartitionManager.js';
export type { PendingDelivery, PartitionSpec } from './network/NetworkTypes.js';
export { ScenarioBuilder } from './scenarios/ScenarioBuilder.js';
export type { BaseScenario } from './scenarios/BaseScenario.js';
export { applyByzantineBehavior, deterministicByzantineChoice } from './actors/ByzantineBehavior.js';
