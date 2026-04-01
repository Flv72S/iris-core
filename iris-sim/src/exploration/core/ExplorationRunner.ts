/**
 * S-5 — Run S-4–style risk quantification per parameter config. Sequential, deterministic.
 */

import { createSimulationConfig } from '../../simulation/engine/SimulationConfig.js';
import { createDegradationConfig } from '../../degradation/core/DegradationConfig.js';
import type { DegradationConfig } from '../../degradation/core/DegradationConfig.js';
import { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';
import { createChaosConfig } from '../../chaos/engine/ChaosConfig.js';
import { ChaosEngine } from '../../chaos/engine/ChaosEngine.js';
import { buildEnterpriseStressChaos } from '../../chaos/scenarios/EnterpriseStressScenario.js';
import { VerificationEngine } from '../../verification/core/VerificationEngine.js';
import { createVerificationConfig } from '../../verification/core/VerificationConfig.js';
import { createNoDoubleDeliveryProperty } from '../../verification/properties/NoDoubleDeliveryProperty.js';
import { createNoDeliveryAcrossPartitionProperty } from '../../verification/properties/NoDeliveryAcrossPartitionProperty.js';
import { createNoInvalidStateTransitionProperty } from '../../verification/properties/NoInvalidStateTransitionProperty.js';
import { createNoNegativeTickProperty } from '../../verification/properties/NoNegativeTickProperty.js';
import { createEventualDeliveryProperty } from '../../verification/properties/EventualDeliveryProperty.js';
import { createNoDeadlockProperty } from '../../verification/properties/NoDeadlockProperty.js';
import { createNoStarvationProperty } from '../../verification/properties/NoStarvationProperty.js';
import { createPartitionHealingProperty } from '../../verification/properties/PartitionHealingProperty.js';
import { createNoPermanentSplitBrainProperty } from '../../verification/properties/NoPermanentSplitBrainProperty.js';
import type { ParameterConfig, ParameterResult } from './ExplorationTypes.js';
import { generateSeeds } from '../../risk/core/SeedGenerator.js';
import { collectSeedResult } from '../../risk/metrics/RiskMetricsCollector.js';
import type { ChaosRunData } from '../../risk/metrics/RiskMetricsCollector.js';
import { aggregateSeedResults } from '../../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../../risk/aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../../risk/aggregation/RiskEnvelope.js';
import { computeRiskReportHash } from '../../risk/reporting/RiskReportHasher.js';
import { createRiskConfig } from '../../risk/core/RiskConfig.js';

function buildParameterizedTopology(engine: GlobalSimulationEngine, nodeCount: number): void {
  const numClusters = 10;
  const perCluster = Math.max(1, Math.floor(nodeCount / numClusters));
  for (let c = 1; c <= numClusters; c++) {
    engine.createCluster('c' + c);
  }
  for (let c = 1; c <= numClusters; c++) {
    for (let n = 0; n < perCluster; n++) {
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
    engine.scheduleEvent(tick, 'explore:traffic:' + String(i) + ':' + String(tick), () => {
      const node = engine.getNode(from);
      if (node && node.isAlive) {
        node.sendMessage(to, { seq: i }, 'stress', engine.runtime.clock.currentTick);
      }
    });
  }
}

function runChaosOnly(
  seed: string,
  maxTicks: bigint,
  messageCount: number,
  nodeCount: number,
  degradationConfigOverride?: Partial<DegradationConfig>,
): ChaosRunData {
  const simConfig = createSimulationConfig({
    maxTicks,
    deterministicSeed: seed,
    ...(degradationConfigOverride ? { degradationConfig: createDegradationConfig(degradationConfigOverride) } : {}),
  });
  const engine = new GlobalSimulationEngine(simConfig);
  engine.initialize(seed);
  buildParameterizedTopology(engine, nodeCount);
  scheduleTraffic(engine, messageCount, maxTicks);
  const chaosConfig = createChaosConfig({ attackSeed: seed, invariantStrictMode: true });
  const chaosEngine = new ChaosEngine(engine, chaosConfig);
  chaosEngine.initialize(seed);
  buildEnterpriseStressChaos(chaosEngine);
  chaosEngine.run();
  const report = chaosEngine.generateReport();
  const simulationHash = engine.getExecutionHash();
  const degradationMetrics = engine.getDegradationMetrics();
  engine.shutdown();
  const breakdown = report.softEvents.breakdown as Record<string, number>;
  const partitionCount = report.peakStressIndicators?.maxPartitionCount ?? 0;
  return {
    simulationHash,
    hardViolationCount: chaosEngine.hardViolationCount,
    softEventCount: chaosEngine.softEventCount,
    softEventBreakdown: breakdown,
    partitionCount,
    ...(degradationMetrics ? { degradationMetrics } : {}),
  };
}

function runVerificationOnly(
  seed: string,
  maxTicks: bigint,
  messageCount: number,
  nodeCount: number,
  degradationConfigOverride?: Partial<DegradationConfig>,
): {
  simulationHash: string;
  verificationHash: string;
  report: ReturnType<VerificationEngine['getVerificationReport']>;
  degradationMetrics?: import('../../degradation/metrics/DegradationMetrics.js').DegradationMetrics;
} {
  const simConfig = createSimulationConfig({
    maxTicks,
    deterministicSeed: seed,
    ...(degradationConfigOverride ? { degradationConfig: createDegradationConfig(degradationConfigOverride) } : {}),
  });
  const engine = new GlobalSimulationEngine(simConfig);
  engine.initialize(seed);
  buildParameterizedTopology(engine, nodeCount);
  scheduleTraffic(engine, messageCount, maxTicks);
  const chaosConfig = createChaosConfig({ attackSeed: seed, invariantStrictMode: true });
  const chaosEngine = new ChaosEngine(engine, chaosConfig);
  chaosEngine.initialize(seed);
  buildEnterpriseStressChaos(chaosEngine);
  const verConfig = createVerificationConfig({ maxTraceWindowSize: 15000, livenessWindowTicks: 500n });
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
  for (let t = 0n; t <= maxTicks; t++) {
    engine.runUntil(t);
    verification.evaluateTick(t);
  }
  verification.finalize();
  const simulationHash = engine.getExecutionHash();
  const report = verification.getVerificationReport();
  const verificationHash = verification.getVerificationHash();
  const degradationMetrics = engine.getDegradationMetrics();
  engine.shutdown();
  return { simulationHash, verificationHash, report, ...(degradationMetrics ? { degradationMetrics } : {}) };
}

/** Run one seed for a parameter config; returns SeedResult (chaos + verification, degradation merged). Exported for S-6 validation. S-5F: optional degradationConfigOverride for protection sensitivity tests. */
export function runOneSeedForConfig(
  seed: string,
  config: ParameterConfig,
  degradationConfigOverride?: Partial<DegradationConfig>,
): import('../../risk/core/RiskTypes.js').SeedResult {
  const maxTicks = BigInt(config.duration);
  const messageCount = Math.max(100, Math.floor(5000 * config.intensity));
  const chaosData = runChaosOnly(seed, maxTicks, messageCount, config.nodeCount, degradationConfigOverride);
  const verificationData = runVerificationOnly(seed, maxTicks, messageCount, config.nodeCount, degradationConfigOverride);
  return collectSeedResult(
    seed,
    chaosData,
    verificationData,
    config.duration,
    messageCount,
    verificationData.degradationMetrics,
  );
}

export interface ExplorationRunnerOptions {
  readonly baseSeed: string;
  readonly seedsPerConfig: number;
  readonly onConfigProgress?: (completed: number, total: number) => void;
}

/**
 * Run risk quantification for each parameter config using S-4 aggregation. Sequential.
 */
export function runExploration(
  configs: readonly ParameterConfig[],
  options: ExplorationRunnerOptions,
): ParameterResult[] {
  const riskConfig = createRiskConfig({
    baseSeed: options.baseSeed,
    numberOfSeeds: options.seedsPerConfig,
    maxTicks: 1500n,
    messageCount: 5000,
  });
  const results: ParameterResult[] = [];
  for (let i = 0; i < configs.length; i++) {
    const paramConfig = configs[i];
    const seeds = generateSeeds(options.baseSeed, options.seedsPerConfig);
    const seedResults = seeds.map((seed) => runOneSeedForConfig(seed, paramConfig));
    const aggregated = aggregateSeedResults(seedResults);
    const stabilityIndex = computeStabilityIndex(aggregated, riskConfig);
    const riskEnvelope = classifyRiskEnvelope(aggregated, riskConfig);
    const riskReportHash = computeRiskReportHash(seedResults, aggregated, stabilityIndex, riskEnvelope);
    let maxDegradationDrops = 0;
    let maxDegradationSaturation = 0;
    let maxDegradationLatency = 0;
    for (const r of seedResults) {
      const dm = r.degradationMetrics;
      if (dm) {
        if ((dm.totalDroppedMessages ?? 0) > maxDegradationDrops) maxDegradationDrops = dm.totalDroppedMessages ?? 0;
        if ((dm.saturationEventCount ?? 0) > maxDegradationSaturation) maxDegradationSaturation = dm.saturationEventCount ?? 0;
        if ((dm.maxLatencyMultiplier ?? 0) > maxDegradationLatency) maxDegradationLatency = dm.maxLatencyMultiplier ?? 0;
      }
    }
    results.push(
      Object.freeze({
        config: paramConfig,
        stabilityIndex,
        safetyFailureRate: aggregated.safetyFailureRate,
        livenessFailureRate: aggregated.livenessFailureRate,
        riskEnvelope,
        maxSoftEvents: aggregated.maxSoftEventsObserved,
        maxLivenessDelay: aggregated.maxLivenessDelay,
        riskReportHash,
        ...(maxDegradationDrops > 0 || maxDegradationSaturation > 0 || maxDegradationLatency > 0
          ? { maxDegradationDrops, maxDegradationSaturationEvents: maxDegradationSaturation, maxDegradationLatencyMultiplier: maxDegradationLatency }
          : {}),
      }),
    );
    options.onConfigProgress?.(i + 1, configs.length);
  }
  return results;
}
