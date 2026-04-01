/**
 * S-2 Soft Scalability — Runner. Runs each test twice; collects hash, hard/soft counts and breakdown.
 */

import { createSimulationConfig } from '../../simulation/engine/SimulationConfig.js';
import { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';
import { createChaosConfig } from '../engine/ChaosConfig.js';
import { ChaosEngine } from '../engine/ChaosEngine.js';
import { ChaosScenarioBuilder } from '../scenarios/ChaosScenarioBuilder.js';
import type { SoftScalabilityTestConfig } from './SoftScalabilityTestConfig.js';
import type { ChaosScenarioParams } from './SoftScalabilityTestConfig.js';
import type { SoftInvariantType } from '../monitoring/InvariantTypes.js';

export interface SingleRunResult {
  readonly combinedHash: string;
  readonly hardViolations: number;
  readonly softTotal: number;
  readonly softBreakdown: Readonly<Record<SoftInvariantType, number>>;
}

export interface TestResult {
  readonly config: SoftScalabilityTestConfig;
  readonly run1: SingleRunResult;
  readonly run2: SingleRunResult;
  readonly hashIdentical: boolean;
  readonly hardViolationsZero: boolean;
}

function buildTopology(engine: GlobalSimulationEngine, numClusters: number, nodesPerCluster: number): void {
  for (let c = 1; c <= numClusters; c++) {
    engine.createCluster('c' + c);
  }
  for (let c = 1; c <= numClusters; c++) {
    for (let n = 0; n < nodesPerCluster; n++) {
      engine.createNode('c' + c + '-n' + n, 'c' + c);
    }
  }
}

function scheduleTraffic(engine: GlobalSimulationEngine, messageCount: number, maxTicks: bigint): void {
  const clusters = engine.getClusterIds();
  const rng = engine.runtime.rng;
  const maxTickNum = Number(maxTicks) - 1;
  const span = Math.max(1, Math.min(maxTickNum, 1999));
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
    const tick = 1n + BigInt(rng.nextInt(span));
    engine.scheduleEvent(tick, 'scale:traffic:' + String(i) + ':' + String(tick), () => {
      const node = engine.getNode(from);
      if (node && node.isAlive) {
        node.sendMessage(to, { seq: i }, 'stress', engine.runtime.clock.currentTick);
      }
    });
  }
}

function buildChaosFromParams(chaosEngine: ChaosEngine, params: ChaosScenarioParams, numClusters: number): void {
  const builder = new ChaosScenarioBuilder(chaosEngine);
  builder.addCrashStorm(600n, params.crashStormIntensityPercent);
  builder.addPartitionFlap(600n, 300n, 50n, 'c1', 'c2');
  builder.addPartitionFlap(600n, 300n, 50n, 'c3', 'c4');
  builder.addByzantineSwarm(700n, params.byzantineSwarmPercent);
  const fromNodes: string[] = [];
  const toNodes: string[] = [];
  for (let c = 1; c <= numClusters; c++) {
    fromNodes.push('c' + c + '-n0');
    toNodes.push('c' + (c % numClusters + 1) + '-n1');
  }
  builder.addFlood(800n, fromNodes, toNodes, params.floodMessagesPerPair);
  const left: string[] = [];
  const right: string[] = [];
  for (let c = 1; c <= numClusters; c++) {
    if (c <= numClusters / 2) left.push('c' + c);
    else right.push('c' + c);
  }
  builder.addSplitBrain(1000n, 200n, left, right);
  builder.addRecoveryStorm(1200n, params.recoveryStormIntensityPercent);
  builder.addTimingManipulation(1100n, 2, 100n);
  builder.build();
}

function runOnce(config: SoftScalabilityTestConfig): SingleRunResult {
  const simConfig = createSimulationConfig(config.simulationConfig);
  const engine = new GlobalSimulationEngine(simConfig);
  engine.initialize(config.simulationConfig.deterministicSeed);
  buildTopology(engine, config.simulationConfig.numberOfClusters, config.simulationConfig.nodesPerCluster);
  scheduleTraffic(engine, config.messageCount, config.simulationConfig.maxTicks);
  const chaosConfig = createChaosConfig(config.chaosConfig);
  const chaosEngine = new ChaosEngine(engine, chaosConfig);
  chaosEngine.initialize(config.simulationConfig.deterministicSeed);
  buildChaosFromParams(chaosEngine, config.chaosScenarioParams, config.simulationConfig.numberOfClusters);
  chaosEngine.run();
  const combinedHash = chaosEngine.getCombinedHash();
  const hardViolations = chaosEngine.hardViolationCount;
  const softTotal = chaosEngine.softEventCount;
  const softBreakdown = chaosEngine.generateReport().softEvents.breakdown;
  engine.shutdown();
  return Object.freeze({ combinedHash, hardViolations, softTotal, softBreakdown });
}

export function runTest(config: SoftScalabilityTestConfig): TestResult {
  const run1 = runOnce(config);
  const run2 = runOnce(config);
  const hashIdentical = run1.combinedHash === run2.combinedHash;
  const hardViolationsZero = run1.hardViolations === 0 && run2.hardViolations === 0;
  return Object.freeze({
    config,
    run1,
    run2,
    hashIdentical,
    hardViolationsZero,
  });
}

export function runAllTests(configs: SoftScalabilityTestConfig[]): TestResult[] {
  const results: TestResult[] = [];
  for (const config of configs) {
    results.push(runTest(config));
  }
  return results;
}
