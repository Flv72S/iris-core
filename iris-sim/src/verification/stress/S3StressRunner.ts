/**
 * S-3 Robustness Validation — Runner. Per test: chaos run (soft count) + two verification runs (determinism).
 */

import { createSimulationConfig } from '../../simulation/engine/SimulationConfig.js';
import { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';
import { createChaosConfig } from '../../chaos/engine/ChaosConfig.js';
import { ChaosEngine } from '../../chaos/engine/ChaosEngine.js';
import { ChaosScenarioBuilder } from '../../chaos/scenarios/ChaosScenarioBuilder.js';
import type { S3StressTestConfig } from './S3StressConfig.js';
import type { ChaosScenarioParams } from '../../chaos/validation/SoftScalabilityTestConfig.js';
import { VerificationEngine } from '../core/VerificationEngine.js';
import { createVerificationConfig } from '../core/VerificationConfig.js';
import { createNoDoubleDeliveryProperty } from '../properties/NoDoubleDeliveryProperty.js';
import { createNoDeliveryAcrossPartitionProperty } from '../properties/NoDeliveryAcrossPartitionProperty.js';
import { createNoInvalidStateTransitionProperty } from '../properties/NoInvalidStateTransitionProperty.js';
import { createNoNegativeTickProperty } from '../properties/NoNegativeTickProperty.js';
import { createEventualDeliveryProperty } from '../properties/EventualDeliveryProperty.js';
import { createNoDeadlockProperty } from '../properties/NoDeadlockProperty.js';
import { createNoStarvationProperty } from '../properties/NoStarvationProperty.js';
import { createPartitionHealingProperty } from '../properties/PartitionHealingProperty.js';
import { createNoPermanentSplitBrainProperty } from '../properties/NoPermanentSplitBrainProperty.js';
import type { VerificationReport } from '../reporting/VerificationReport.js';

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

function runChaosOnly(config: S3StressTestConfig): { simulationHash: string; softEventCount: number } {
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
  const simulationHash = engine.getExecutionHash();
  const softEventCount = chaosEngine.softEventCount;
  engine.shutdown();
  return { simulationHash, softEventCount };
}

function runWithVerification(config: S3StressTestConfig): {
  simulationHash: string;
  verificationHash: string;
  report: VerificationReport;
} {
  const simConfig = createSimulationConfig(config.simulationConfig);
  const engine = new GlobalSimulationEngine(simConfig);
  engine.initialize(config.simulationConfig.deterministicSeed);
  buildTopology(engine, config.simulationConfig.numberOfClusters, config.simulationConfig.nodesPerCluster);
  scheduleTraffic(engine, config.messageCount, config.simulationConfig.maxTicks);
  const chaosConfig = createChaosConfig(config.chaosConfig);
  const chaosEngine = new ChaosEngine(engine, chaosConfig);
  chaosEngine.initialize(config.simulationConfig.deterministicSeed);
  buildChaosFromParams(chaosEngine, config.chaosScenarioParams, config.simulationConfig.numberOfClusters);

  const verConfig = createVerificationConfig({
    maxTraceWindowSize: 20000,
    livenessWindowTicks: 500n,
  });
  const verification = new VerificationEngine(engine, verConfig);
  verification.registerProperty(createNoDoubleDeliveryProperty());
  verification.registerProperty(createNoDeliveryAcrossPartitionProperty());
  verification.registerProperty(createNoInvalidStateTransitionProperty());
  verification.registerProperty(createNoNegativeTickProperty());
  verification.registerProperty(createEventualDeliveryProperty());
  verification.registerProperty(createNoDeadlockProperty(verConfig.livenessWindowTicks));
  verification.registerProperty(createNoStarvationProperty());
  verification.registerProperty(createPartitionHealingProperty());
  verification.registerProperty(createNoPermanentSplitBrainProperty());
  verification.initialize();

  const maxTicks = config.simulationConfig.maxTicks;
  for (let t = 0n; t <= maxTicks; t++) {
    engine.runUntil(t);
    verification.evaluateTick(t);
  }
  verification.finalize();

  const simulationHash = engine.getExecutionHash();
  const report = verification.getVerificationReport();
  const verificationHash = verification.getVerificationHash();
  engine.shutdown();
  return { simulationHash, verificationHash, report };
}

export interface S3StressTestResult {
  readonly config: S3StressTestConfig;
  readonly softEventCount: number;
  readonly simulationHashRun1: string;
  readonly simulationHashRun2: string;
  readonly verificationHashRun1: string;
  readonly verificationHashRun2: string;
  readonly propertyResultsRun1: VerificationReport;
  readonly simulationHashIdentical: boolean;
  readonly verificationHashIdentical: boolean;
  readonly safetyPass: boolean;
  readonly livenessPass: boolean;
}

export function runS3StressTest(config: S3StressTestConfig): S3StressTestResult {
  const { softEventCount } = runChaosOnly(config);
  const run1 = runWithVerification(config);
  const run2 = runWithVerification(config);

  const simulationHashIdentical = run1.simulationHash === run2.simulationHash;
  const verificationHashIdentical = run1.verificationHash === run2.verificationHash;
  const safetyPass =
    !run1.report.safetyResults.some((r) => r.status === 'VIOLATED') &&
    !run2.report.safetyResults.some((r) => r.status === 'VIOLATED');
  const livenessPass =
    !run1.report.livenessResults.some((r) => r.status === 'VIOLATED') &&
    !run2.report.livenessResults.some((r) => r.status === 'VIOLATED');

  return Object.freeze({
    config,
    softEventCount,
    simulationHashRun1: run1.simulationHash,
    simulationHashRun2: run2.simulationHash,
    verificationHashRun1: run1.verificationHash,
    verificationHashRun2: run2.verificationHash,
    propertyResultsRun1: run1.report,
    simulationHashIdentical,
    verificationHashIdentical,
    safetyPass,
    livenessPass,
  });
}

export function runAllS3StressTests(configs: S3StressTestConfig[]): S3StressTestResult[] {
  const results: S3StressTestResult[] = [];
  for (const config of configs) {
    results.push(runS3StressTest(config));
  }
  return results;
}
