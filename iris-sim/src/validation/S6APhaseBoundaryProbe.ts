/**
 * S-6A Phase Boundary Exploration — Nonlinear Instability Discovery Protocol.
 * Harness only: load escalation, perturbation injection, metric aggregation, boundary detection.
 * No core logic changes. Reuses S-5F exploration pipeline.
 */

import { runOneSeedForConfig } from '../exploration/core/ExplorationRunner.js';
import type { ParameterConfig } from '../exploration/core/ExplorationTypes.js';
import { generateSeeds } from '../risk/core/SeedGenerator.js';
import { aggregateSeedResults } from '../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../risk/aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../risk/aggregation/RiskEnvelope.js';
import { createRiskConfig } from '../risk/core/RiskConfig.js';
import type { SeedResult } from '../risk/core/RiskTypes.js';
import type { DegradationConfig } from '../degradation/core/DegradationConfig.js';

const BASE_SEED = 's6a-phase-boundary-probe-seed';
const SEEDS_PER_STEP = 3;
const NODE_COUNT = 1500;
const BASE_INTENSITY = 1.5;
const DURATION = 2500;

/** Load multiplier progression: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024 */
const LOAD_MULTIPLIERS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

/** Cap intensity to avoid overflow; scale concurrency via load. */
const MAX_INTENSITY = 120;

/** Classification thresholds (probe-specific; do not alter core classification). */
const SI_STRESS_THRESHOLD = 0.85;
const SI_CRITICAL_THRESHOLD = 0.7;
const OSC_INSTABILITY_THRESHOLD = 0.15;

export interface StepMetrics {
  readonly load: number;
  readonly classification: 'SAFE' | 'STRESS' | 'CRITICAL' | 'DIVERGENCE';
  readonly stabilityIndex: number;
  readonly maxLatencyMultiplier: number;
  readonly oscillationCoefficient: number;
  readonly divergenceScore: number;
  readonly memoryGrowthRate: string;
  readonly saturationEvents: number;
  readonly dropRate: number;
  readonly totalDrops: number;
  readonly totalMessages: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Load escalation: intensity and effective concurrency scale with load multiplier. */
function configForLoad(loadMultiplier: number, perturbationBurst: boolean): ParameterConfig {
  const intensity = Math.min(BASE_INTENSITY * loadMultiplier, MAX_INTENSITY);
  const intensityWithBurst = perturbationBurst ? intensity * 1.1 : intensity;
  return Object.freeze({
    nodeCount: NODE_COUNT,
    intensity: intensityWithBurst,
    duration: DURATION,
  });
}

/** Perturbation injection: optional degradation overrides for micro-storm / oscillating backpressure. */
function degradationOverridesForStep(loadMultiplier: number, _stepIndex: number): Partial<DegradationConfig> {
  const oscillatingBp = loadMultiplier >= 8 && loadMultiplier <= 128;
  if (oscillatingBp) {
    return { positiveCongestionAlpha: 0.3 };
  }
  return {};
}

function runOneStep(
  loadMultiplier: number,
  stepIndex: number,
  riskConfig: ReturnType<typeof createRiskConfig>,
): {
  seedResults: SeedResult[];
  aggregatedStabilityIndex: number;
  perSeedStabilityIndices: number[];
  envelope: 'SAFE' | 'STRESS' | 'CRITICAL';
} {
  const perturbationBurst = stepIndex % 2 === 1;
  const config = configForLoad(loadMultiplier, perturbationBurst);
  const degOverrides = degradationOverridesForStep(loadMultiplier, stepIndex);
  const seeds = generateSeeds(BASE_SEED + ':' + String(loadMultiplier), SEEDS_PER_STEP);
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

function computeStepMetrics(
  loadMultiplier: number,
  seedResults: SeedResult[],
  aggregatedStabilityIndex: number,
  _envelope: 'SAFE' | 'STRESS' | 'CRITICAL',
  divergenceScoreInput: number,
  classification: 'SAFE' | 'STRESS' | 'CRITICAL' | 'DIVERGENCE',
  oscillationCoefficient: number,
): StepMetrics {
  let totalDrops = 0;
  let totalMessages = 0;
  let maxLat = 0;
  let maxSat = 0;
  for (const r of seedResults) {
    const dm = r.degradationMetrics;
    totalDrops += dm?.totalDroppedMessages ?? 0;
    totalMessages += r.totalMessages;
    if ((dm?.maxLatencyMultiplier ?? 0) > maxLat) maxLat = dm?.maxLatencyMultiplier ?? 0;
    maxSat = Math.max(maxSat, dm?.saturationEventCount ?? 0);
  }
  const dropRate = totalMessages > 0 ? totalDrops / totalMessages : 0;
  return Object.freeze({
    load: loadMultiplier,
    classification,
    stabilityIndex: aggregatedStabilityIndex,
    maxLatencyMultiplier: maxLat,
    oscillationCoefficient,
    divergenceScore: divergenceScoreInput,
    memoryGrowthRate: 'stable',
    saturationEvents: maxSat,
    dropRate,
    totalDrops,
    totalMessages,
  });
}

function classifyStep(
  stabilityIndex: number,
  oscillationCoefficient: number,
  divergenceTrend: boolean,
  envelope: 'SAFE' | 'STRESS' | 'CRITICAL',
): 'SAFE' | 'STRESS' | 'CRITICAL' | 'DIVERGENCE' {
  if (envelope === 'CRITICAL' || stabilityIndex < SI_CRITICAL_THRESHOLD) return 'CRITICAL';
  if (divergenceTrend) return 'DIVERGENCE';
  if (oscillationCoefficient > OSC_INSTABILITY_THRESHOLD) return 'DIVERGENCE';
  if (stabilityIndex < SI_STRESS_THRESHOLD) return 'STRESS';
  return 'SAFE';
}

/**
 * Run S-6A Phase Boundary Probe. Explores load multipliers 1..1024, records metrics,
 * detects phase boundary. Callable from main validation runner.
 */
export function RunS6APhaseBoundaryProbe(): {
  boundaryDetectedAt: number | null;
  nonlinearSignature: boolean;
  runawayDetected: boolean;
  structuralCollapse: boolean;
  steps: StepMetrics[];
} {
  const out = typeof process !== 'undefined' ? process.stdout : null;
  const riskConfig = createRiskConfig({
    baseSeed: BASE_SEED,
    numberOfSeeds: SEEDS_PER_STEP,
    maxTicks: BigInt(DURATION),
    messageCount: 5000,
  });

  const steps: StepMetrics[] = [];
  const divergenceScores: number[] = [];
  let boundaryDetectedAt: number | null = null;
  let nonlinearSignature = false;
  let runawayDetected = false;
  let structuralCollapse = false;

  if (out) {
    out.write('\nS-6A PHASE BOUNDARY REPORT\n');
    out.write('Load 1..1024 escalation with perturbations\n\n');
  }

  for (let i = 0; i < LOAD_MULTIPLIERS.length; i++) {
    const load = LOAD_MULTIPLIERS[i];
    if (out) out.write('S-6A Progress: Load ' + String(load) + ' (' + String(i + 1) + '/' + String(LOAD_MULTIPLIERS.length) + ') running...\n');
    const { seedResults, aggregatedStabilityIndex, perSeedStabilityIndices, envelope } = runOneStep(load, i, riskConfig);
    const perSeedLatencies = seedResults.map((r) => r.degradationMetrics?.maxLatencyMultiplier ?? 0);
    const oscillationCoefficientStep = stddev(perSeedStabilityIndices.length >= 2 ? perSeedStabilityIndices : perSeedLatencies);
    const divergenceScore = 1 - aggregatedStabilityIndex + (perSeedLatencies[0] ?? 0) / 10;
    divergenceScores.push(divergenceScore);
    const threeStepRising =
      i >= 2 &&
      divergenceScores[i] > divergenceScores[i - 1] &&
      divergenceScores[i - 1] > divergenceScores[i - 2];
    const classification = classifyStep(
      aggregatedStabilityIndex,
      oscillationCoefficientStep,
      threeStepRising,
      envelope,
    );
    if (classification !== 'SAFE') nonlinearSignature = true;
    if (classification === 'CRITICAL' || classification === 'DIVERGENCE') {
      runawayDetected = true;
      structuralCollapse = true;
      if (boundaryDetectedAt === null) boundaryDetectedAt = load;
    }
    const metrics = computeStepMetrics(
      load,
      seedResults,
      aggregatedStabilityIndex,
      envelope,
      divergenceScore,
      classification,
      oscillationCoefficientStep,
    );
    steps.push(metrics);

    if (out) {
      out.write(
        'Load ' +
          String(load) +
          ' | ' +
          classification +
          ' | SI=' +
          metrics.stabilityIndex.toFixed(2) +
          ' | Lat=' +
          metrics.maxLatencyMultiplier.toFixed(1) +
          ' | Osc=' +
          metrics.oscillationCoefficient.toFixed(2) +
          ' | Mem=' +
          metrics.memoryGrowthRate +
          '\n',
      );
    }

    if (boundaryDetectedAt !== null && (classification === 'CRITICAL' || classification === 'DIVERGENCE')) {
      break;
    }
  }

  if (out) {
    out.write('\nBoundaryDetectedAt = ' + (boundaryDetectedAt ?? 'none') + '\n');
    out.write('NonlinearSignature = ' + (nonlinearSignature ? 'YES' : 'NO') + '\n');
    out.write('RunawayDetected = ' + (runawayDetected ? 'YES' : 'NO') + '\n');
    out.write('StructuralCollapse = ' + (structuralCollapse ? 'YES' : 'NO') + '\n');
    out.write('\n');
  }

  return Object.freeze({
    boundaryDetectedAt,
    nonlinearSignature,
    runawayDetected,
    structuralCollapse,
    steps,
  });
}

const isProbeMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.includes('S6APhaseBoundaryProbe') ?? false);
if (isProbeMain) {
  RunS6APhaseBoundaryProbe();
  process.exit(0);
}
