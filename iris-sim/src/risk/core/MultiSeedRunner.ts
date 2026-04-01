/**
 * S-4 — Deterministic multi-seed runner. One chaos run + one verification run per seed (sequential).
 */

import { createSimulationConfig } from '../../simulation/engine/SimulationConfig.js';
import { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';
import { createChaosConfig } from '../../chaos/engine/ChaosConfig.js';
import { ChaosEngine } from '../../chaos/engine/ChaosEngine.js';
import { buildEnterpriseStressTopology, scheduleEnterpriseTraffic, buildEnterpriseStressChaos } from '../../chaos/scenarios/EnterpriseStressScenario.js';
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
import type { SeedResult } from './RiskTypes.js';
import type { RiskConfig } from './RiskConfig.js';
import { collectSeedResult } from '../metrics/RiskMetricsCollector.js';
import type { ChaosRunData } from '../metrics/RiskMetricsCollector.js';

function runChaosOnly(
  seed: string,
  maxTicks: bigint,
  messageCount: number,
): ChaosRunData {
  const simConfig = createSimulationConfig({ maxTicks, deterministicSeed: seed });
  const engine = new GlobalSimulationEngine(simConfig);
  engine.initialize(seed);
  buildEnterpriseStressTopology(engine);
  scheduleEnterpriseTraffic(engine, messageCount);
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
): {
  simulationHash: string;
  verificationHash: string;
  report: ReturnType<VerificationEngine['getVerificationReport']>;
  degradationMetrics?: import('../../degradation/metrics/DegradationMetrics.js').DegradationMetrics;
} {
  const simConfig = createSimulationConfig({ maxTicks, deterministicSeed: seed });
  const engine = new GlobalSimulationEngine(simConfig);
  engine.initialize(seed);
  buildEnterpriseStressTopology(engine);
  scheduleEnterpriseTraffic(engine, messageCount);
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

export function runOneSeed(seed: string, config: RiskConfig): SeedResult {
  const chaosData = runChaosOnly(seed, config.maxTicks, config.messageCount);
  const verificationData = runVerificationOnly(seed, config.maxTicks, config.messageCount);
  return collectSeedResult(
    seed,
    chaosData,
    verificationData,
    Number(config.maxTicks),
    config.messageCount,
    verificationData.degradationMetrics,
  );
}

export function runAllSeeds(seeds: string[], config: RiskConfig): SeedResult[] {
  const results: SeedResult[] = [];
  for (const seed of seeds) {
    results.push(runOneSeed(seed, config));
  }
  return results;
}
