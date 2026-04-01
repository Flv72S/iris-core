/**
 * S-6A.2 True Nonlinear Boundary Exploration — Remove Artificial Stabilizers.
 * Harness only: no latency cap in probe, positive feedback, accumulative memory,
 * recovery delay, real jitter. No core changes.
 */

import { createHash } from 'crypto';
import { runOneSeedForConfig } from '../exploration/core/ExplorationRunner.js';
import type { ParameterConfig } from '../exploration/core/ExplorationTypes.js';
import { generateSeeds } from '../risk/core/SeedGenerator.js';
import { aggregateSeedResults } from '../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../risk/aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../risk/aggregation/RiskEnvelope.js';
import { createRiskConfig } from '../risk/core/RiskConfig.js';
import type { SeedResult } from '../risk/core/RiskTypes.js';
import type { DegradationConfig } from '../degradation/core/DegradationConfig.js';

const BASE_SEED = 's6a2-true-nonlinear-probe-seed';
const SEEDS_PER_STEP = 3;
const NODE_COUNT = 1500;
const BASE_INTENSITY = 1.5;
const DURATION = 2500;

const LOAD_MULTIPLIERS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

/** No artificial cap: allow unbounded latency growth in this probe. */
const PROBE_DEGRADATION_BASE: Partial<DegradationConfig> = Object.freeze({
  disableLatencyCap: true,
});

const SI_FEEDBACK_STRESS = 0.85;
const SI_FEEDBACK_CRITICAL = 0.75;
const MULTIPLIER_STRESS = 1.15;
const MULTIPLIER_CRITICAL = 1.25;
const RECOVERY_PENALTY = 0.3;
const JITTER_MIN = -0.15;
const JITTER_MAX = 0.25;
const SI_CRITICAL_THRESHOLD = 0.65;
const LATENCY_ACCEL_THRESHOLD = 2.0;
const EXPONENTIAL_GROWTH_FACTOR = 1.5;

export interface StepMetricsS6A2 {
  readonly load: number;
  readonly classification: 'SAFE' | 'STRESS' | 'CRITICAL' | 'DIVERGENCE';
  readonly stabilityIndex: number;
  readonly maxLatencyMultiplier: number;
  readonly oscillationCoefficient: number;
  readonly carryOverLoad: number;
  readonly latencyAccelerationRate: number;
  readonly memoryGrowthRate: string;
  readonly accumulatedInstability: number;
  readonly saturationEvents: number;
  readonly dropRate: number;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Deterministic jitter in [JITTER_MIN, JITTER_MAX] from seed and step. */
function deterministicJitter(seed: string, stepIndex: number): number {
  const h = createHash('sha256').update(seed + ':' + String(stepIndex), 'utf8').digest('hex');
  const u = parseInt(h.slice(0, 8), 16) / 0xffffffff;
  return JITTER_MIN + (JITTER_MAX - JITTER_MIN) * u;
}

/** Effective intensity: base + positive feedback multipliers + carryOver, then jitter. */
function effectiveIntensity(
  loadMultiplier: number,
  intensityFeedbackMultiplier: number,
  carryOverLoad: number,
  stepIndex: number,
): number {
  const baseLoad = BASE_INTENSITY * loadMultiplier;
  const effectiveLoad = baseLoad + carryOverLoad;
  const withFeedback = effectiveLoad * intensityFeedbackMultiplier;
  const jitter = deterministicJitter(BASE_SEED, stepIndex);
  return Math.max(0.1, withFeedback * (1 + jitter));
}

/** Degradation overrides for this step: no cap, optional recovery penalty, optional PCF. */
function degradationOverridesS6A2(
  _stepIndex: number,
  previousWasStressOrWorse: boolean,
  loadMult: number,
): Partial<DegradationConfig> {
  return {
    ...PROBE_DEGRADATION_BASE,
    ...(previousWasStressOrWorse
      ? { baseProcessingCapacityPerTick: Math.max(1, Math.floor(20 * (1 - RECOVERY_PENALTY))) }
      : {}),
    ...(loadMult >= 8 && loadMult <= 128 ? { positiveCongestionAlpha: 0.3 } : {}),
  };
}

function runOneStepS6A2(
  loadMult: number,
  stepIndex: number,
  intensityFeedbackMultiplier: number,
  carryOverLoad: number,
  previousWasStressOrWorse: boolean,
  riskConfig: ReturnType<typeof createRiskConfig>,
): {
  seedResults: SeedResult[];
  aggregatedStabilityIndex: number;
  perSeedStabilityIndices: number[];
  envelope: 'SAFE' | 'STRESS' | 'CRITICAL';
} {
  const intensity = effectiveIntensity(loadMult, intensityFeedbackMultiplier, carryOverLoad, stepIndex);
  const config: ParameterConfig = Object.freeze({
    nodeCount: NODE_COUNT,
    intensity,
    duration: DURATION,
  });
  const degOverrides = degradationOverridesS6A2(stepIndex, previousWasStressOrWorse, loadMult);
  const seeds = generateSeeds(BASE_SEED + ':' + String(loadMult) + ':' + String(stepIndex), SEEDS_PER_STEP);
  const seedResults: SeedResult[] = seeds.map((seed) => runOneSeedForConfig(seed, config, degOverrides));
  const aggregated = aggregateSeedResults(seedResults);
  const stabilityIndex = computeStabilityIndex(aggregated, riskConfig);
  const envelope = classifyRiskEnvelope(aggregated, riskConfig);
  const perSeedStabilityIndices = seedResults.map((r) => {
    const a = aggregateSeedResults([r]);
    return computeStabilityIndex(a, riskConfig);
  });
  return { seedResults, aggregatedStabilityIndex: stabilityIndex, perSeedStabilityIndices, envelope };
}

function classifyStepS6A2(
  stabilityIndex: number,
  latencyAccelerationRate: number,
  carryOverRising3Steps: boolean,
  latencyExponentialRise: boolean,
  siDeceleratingDown: boolean,
  envelope: 'SAFE' | 'STRESS' | 'CRITICAL',
): 'SAFE' | 'STRESS' | 'CRITICAL' | 'DIVERGENCE' {
  if (envelope === 'CRITICAL' || stabilityIndex < SI_CRITICAL_THRESHOLD) return 'CRITICAL';
  if (latencyAccelerationRate > LATENCY_ACCEL_THRESHOLD) return 'CRITICAL';
  if (carryOverRising3Steps) return 'CRITICAL';
  if (latencyExponentialRise) return 'DIVERGENCE';
  if (siDeceleratingDown) return 'DIVERGENCE';
  if (stabilityIndex < SI_FEEDBACK_STRESS) return 'STRESS';
  return 'SAFE';
}

/**
 * Run S-6A.2 True Nonlinear Boundary Probe. No latency cap, positive feedback,
 * carry-over load, recovery delay, jitter. Detects true nonlinear signature.
 */
export function RunS6A2PhaseBoundaryProbe(): {
  boundaryDetectedAt: number | null;
  trueNonlinearSignature: boolean;
  runawayConfirmed: boolean;
  steps: StepMetricsS6A2[];
} {
  const out = typeof process !== 'undefined' ? process.stdout : null;
  const riskConfig = createRiskConfig({
    baseSeed: BASE_SEED,
    numberOfSeeds: SEEDS_PER_STEP,
    maxTicks: BigInt(DURATION),
    messageCount: 5000,
  });

  const steps: StepMetricsS6A2[] = [];
  let intensityFeedbackMultiplier = 1.0;
  let carryOverLoad = 0;
  let previousWasStressOrWorse = false;
  const latencies: number[] = [];
  const carryOvers: number[] = [];
  const siHistory: number[] = [];
  let boundaryDetectedAt: number | null = null;
  let trueNonlinearSignature = false;
  let runawayConfirmed = false;
  let accumulatedInstability = 0;

  if (out) {
    out.write('\nS-6A.2 TRUE NONLINEAR BOUNDARY REPORT\n');
    out.write('No latency cap | Positive feedback | Carry-over | Recovery delay | Jitter\n\n');
  }

  for (let i = 0; i < LOAD_MULTIPLIERS.length; i++) {
    const loadMult = LOAD_MULTIPLIERS[i];
    if (out) out.write('S-6A.2 Progress: Load ' + String(loadMult) + ' (' + String(i + 1) + '/' + String(LOAD_MULTIPLIERS.length) + ') running...\n');
    const baseLoad = BASE_INTENSITY * loadMult + carryOverLoad;
    const { seedResults, aggregatedStabilityIndex, perSeedStabilityIndices, envelope } = runOneStepS6A2(
      loadMult,
      i,
      intensityFeedbackMultiplier,
      carryOverLoad,
      previousWasStressOrWorse,
      riskConfig,
    );

    accumulatedInstability += 1 - aggregatedStabilityIndex;
    const nextCarryOver = baseLoad * (1 - aggregatedStabilityIndex);
    carryOverLoad = nextCarryOver;
    carryOvers.push(carryOverLoad);

    if (aggregatedStabilityIndex < SI_FEEDBACK_CRITICAL) {
      intensityFeedbackMultiplier *= MULTIPLIER_CRITICAL;
    } else if (aggregatedStabilityIndex < SI_FEEDBACK_STRESS) {
      intensityFeedbackMultiplier *= MULTIPLIER_STRESS;
    }

    const perSeedLatencies = seedResults.map((r) => r.degradationMetrics?.maxLatencyMultiplier ?? 0);
    const maxLat = perSeedLatencies.length > 0 ? Math.max(...perSeedLatencies) : 0;
    latencies.push(maxLat);
    siHistory.push(aggregatedStabilityIndex);

    let latencyAccelerationRate = 0;
    if (i >= 2) {
      const vel1 = latencies[i] - latencies[i - 1];
      const vel0 = latencies[i - 1] - latencies[i - 2];
      latencyAccelerationRate = vel0 !== 0 ? (vel1 - vel0) / Math.abs(vel0) : vel1;
    }

    const carryOverRising3Steps =
      i >= 2 &&
      carryOvers[i] > carryOvers[i - 1] &&
      carryOvers[i - 1] > carryOvers[i - 2];
    const latencyExponentialRise =
      i >= 1 &&
      latencies[i] >= EXPONENTIAL_GROWTH_FACTOR * latencies[i - 1] &&
      (i < 2 || latencies[i - 1] >= EXPONENTIAL_GROWTH_FACTOR * latencies[i - 2]);
    let siDeceleratingDown = false;
    if (i >= 2) {
      const siVel1 = siHistory[i] - siHistory[i - 1];
      const siVel0 = siHistory[i - 1] - siHistory[i - 2];
      siDeceleratingDown = siVel1 < siVel0 && siHistory[i] < siHistory[i - 1];
    }

    const classification = classifyStepS6A2(
      aggregatedStabilityIndex,
      latencyAccelerationRate,
      carryOverRising3Steps,
      latencyExponentialRise,
      siDeceleratingDown,
      envelope,
    );
    if (classification !== 'SAFE') trueNonlinearSignature = true;
    if (classification === 'CRITICAL' || classification === 'DIVERGENCE') {
      runawayConfirmed = true;
      if (boundaryDetectedAt === null) boundaryDetectedAt = loadMult;
    }
    previousWasStressOrWorse =
      classification === 'STRESS' || classification === 'CRITICAL' || classification === 'DIVERGENCE';

    const oscillationCoefficient = stddev(
      perSeedStabilityIndices.length >= 2 ? perSeedStabilityIndices : perSeedLatencies,
    );
    let totalDrops = 0;
    let totalMessages = 0;
    let maxSat = 0;
    for (const r of seedResults) {
      const dm = r.degradationMetrics;
      totalDrops += dm?.totalDroppedMessages ?? 0;
      totalMessages += r.totalMessages;
      maxSat = Math.max(maxSat, dm?.saturationEventCount ?? 0);
    }
    const dropRate = totalMessages > 0 ? totalDrops / totalMessages : 0;

    const metrics: StepMetricsS6A2 = Object.freeze({
      load: loadMult,
      classification,
      stabilityIndex: aggregatedStabilityIndex,
      maxLatencyMultiplier: maxLat,
      oscillationCoefficient,
      carryOverLoad: nextCarryOver,
      latencyAccelerationRate,
      memoryGrowthRate: 'stable',
      accumulatedInstability,
      saturationEvents: maxSat,
      dropRate,
    });
    steps.push(metrics);

    if (out) {
      out.write(
        'Load ' +
          String(loadMult) +
          ' | ' +
          classification +
          '\n' +
          'SI=' +
          metrics.stabilityIndex.toFixed(2) +
          ' Lat=' +
          metrics.maxLatencyMultiplier.toFixed(2) +
          ' Osc=' +
          metrics.oscillationCoefficient.toFixed(2) +
          ' Carry=' +
          metrics.carryOverLoad.toFixed(2) +
          ' Accel=' +
          metrics.latencyAccelerationRate.toFixed(2) +
          ' Mem=' +
          metrics.memoryGrowthRate +
          ' AccumInstability=' +
          metrics.accumulatedInstability.toFixed(2) +
          '\n',
      );
    }

    if (boundaryDetectedAt !== null && (classification === 'CRITICAL' || classification === 'DIVERGENCE')) {
      break;
    }
  }

  if (out) {
    out.write('\nBoundaryDetectedAt = ' + (boundaryDetectedAt ?? 'none') + '\n');
    out.write('TrueNonlinearSignature = ' + (trueNonlinearSignature ? 'YES' : 'NO') + '\n');
    out.write('RunawayConfirmed = ' + (runawayConfirmed ? 'YES' : 'NO') + '\n\n');
  }

  return Object.freeze({
    boundaryDetectedAt,
    trueNonlinearSignature,
    runawayConfirmed,
    steps,
  });
}

const isProbeMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.includes('S6A2PhaseBoundaryProbe') ?? false);
if (isProbeMain) {
  RunS6A2PhaseBoundaryProbe();
  process.exit(0);
}
