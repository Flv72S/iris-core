/**
 * S-6B Regime Characterization & Stability Margin Quantification.
 * Controlled Incremental Perturbation Protocol. No feedback, no carry-over, no recovery penalty.
 * No core changes. Harness only in src/validation.
 */

import { runOneSeedForConfig } from '../exploration/core/ExplorationRunner.js';
import type { ParameterConfig } from '../exploration/core/ExplorationTypes.js';
import { generateSeeds } from '../risk/core/SeedGenerator.js';
import { aggregateSeedResults } from '../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../risk/aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../risk/aggregation/RiskEnvelope.js';
import { createRiskConfig } from '../risk/core/RiskConfig.js';
import type { SeedResult } from '../risk/core/RiskTypes.js';

const BASE_SEED = 's6b-regime-characterization-seed';
const SEEDS_PER_STEP = 3;
const NODE_COUNT = 1500;
const BASE_LOAD = 4;
const BASE_INTENSITY = 1.5 * BASE_LOAD;
const DURATION_PHASE_A = 3000;
const SI_RECOVERY_TARGET = 0.9;

/** Perturbation levels as percentage. No artificial feedback; realistic conditions. */
const PERTURBATION_LEVELS_PCT = [0, 2, 5, 10, 15, 20];

/** No degradation overrides: latency cap on, no feedback, no recovery penalty. */
const NO_OVERRIDES: undefined = undefined;

export interface SmallSignalResult {
  readonly perturbationPct: number;
  readonly stabilityIndexMean: number;
  readonly stabilityIndexVariance: number;
  readonly maxLatency: number;
  readonly latencyDecayRate: number;
  readonly recoveryTime: number | string;
  readonly envelopeStatus: string;
  readonly dropRate: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
}

function runOneCondition(
  intensity: number,
  duration: number,
  riskConfig: ReturnType<typeof createRiskConfig>,
  seedSuffix: string,
  progressLog?: (msg: string) => void,
): { seedResults: SeedResult[]; siMean: number; siVariance: number; maxLat: number; envelope: string; dropRate: number } {
  progressLog?.('  running ' + seedSuffix + ' (duration=' + String(duration) + ')...\n');
  const config: ParameterConfig = Object.freeze({
    nodeCount: NODE_COUNT,
    intensity,
    duration,
  });
  const seeds = generateSeeds(BASE_SEED + ':' + seedSuffix, SEEDS_PER_STEP);
  const seedResults: SeedResult[] = seeds.map((seed) => runOneSeedForConfig(seed, config, NO_OVERRIDES));
  const aggregated = aggregateSeedResults(seedResults);
  const siMean = computeStabilityIndex(aggregated, riskConfig);
  const perSeedSI = seedResults.map((r) => {
    const a = aggregateSeedResults([r]);
    return computeStabilityIndex(a, riskConfig);
  });
  const siVariance = variance(perSeedSI);
  let maxLat = 0;
  let totalDrops = 0;
  let totalMessages = 0;
  for (const r of seedResults) {
    const dm = r.degradationMetrics;
    if ((dm?.maxLatencyMultiplier ?? 0) > maxLat) maxLat = dm?.maxLatencyMultiplier ?? 0;
    totalDrops += dm?.totalDroppedMessages ?? 0;
    totalMessages += r.totalMessages;
  }
  const dropRate = totalMessages > 0 ? totalDrops / totalMessages : 0;
  const envelope = classifyRiskEnvelope(aggregated, riskConfig);
  return { seedResults, siMean, siVariance, maxLat, envelope, dropRate };
}

/** Phase A: Small Signal Stability at each perturbation level. */
function phaseA(
  riskConfig: ReturnType<typeof createRiskConfig>,
  progressLog?: (msg: string) => void,
): SmallSignalResult[] {
  const results: SmallSignalResult[] = [];
  for (const pct of PERTURBATION_LEVELS_PCT) {
    progressLog?.('Phase A: perturbation ' + String(pct) + '%\n');
    const intensity = BASE_INTENSITY * (1 + pct / 100);
    const { siMean, siVariance, maxLat, envelope, dropRate } = runOneCondition(
      intensity,
      DURATION_PHASE_A,
      riskConfig,
      'phaseA:pct' + String(pct),
      progressLog,
    );
    const latencyDecayRate = DURATION_PHASE_A > 0 ? (maxLat - 1) / DURATION_PHASE_A : 0;
    progressLog?.('  done SI=' + siMean.toFixed(3) + ' ' + envelope + '\n');
    let recoveryTime: number | string = 0;
    if (siMean < SI_RECOVERY_TARGET) {
      progressLog?.('  recovery check (5000 tick)...\n');
      const { siMean: si5k } = runOneCondition(
        intensity,
        5000,
        riskConfig,
        'phaseA:recovery:pct' + String(pct),
        progressLog,
      );
      recoveryTime = si5k >= SI_RECOVERY_TARGET ? 2000 : '>5000';
    }
    results.push(
      Object.freeze({
        perturbationPct: pct,
        stabilityIndexMean: siMean,
        stabilityIndexVariance: siVariance,
        maxLatency: maxLat,
        latencyDecayRate,
        recoveryTime,
        envelopeStatus: envelope,
        dropRate,
      }),
    );
  }
  return results;
}

/** Phase B: Damping estimation at 10% perturbation, multiple duration points. */
function phaseB(
  riskConfig: ReturnType<typeof createRiskConfig>,
  progressLog?: (msg: string) => void,
): {
  dampingCoefficient: number;
  decaySlope: number;
  amplitude: number;
  systemClassification: string;
} {
  progressLog?.('Phase B: damping estimation (10% perturbation)\n');
  const intensity = BASE_INTENSITY * 1.1;
  const durations = [1000, 2000, 3000];
  const siAtT: number[] = [];
  for (let i = 0; i < durations.length; i++) {
    const { siMean } = runOneCondition(
      intensity,
      durations[i],
      riskConfig,
      'phaseB:t' + String(durations[i]),
      progressLog,
    );
    siAtT.push(siMean);
    progressLog?.('  duration ' + String(durations[i]) + ' SI=' + siMean.toFixed(3) + '\n');
  }
  const siMin = Math.min(...siAtT);
  const amplitude = Math.max(1e-6, 1 - siMin);
  const decaySlope = (siAtT[2] - siAtT[0]) / (durations[2] - durations[0]);
  const dampingCoefficient = decaySlope / amplitude;
  let systemClassification: string;
  if (dampingCoefficient > 0.1) systemClassification = 'OVERDAMPED';
  else if (dampingCoefficient > 0) systemClassification = 'DAMPED';
  else if (dampingCoefficient >= -0.05) systemClassification = 'MARGINAL';
  else systemClassification = 'UNSTABLE';
  return Object.freeze({
    dampingCoefficient,
    decaySlope,
    amplitude,
    systemClassification,
  });
}

/** Phase C: Sensitivity gradient ΔSI / ΔPerturbation and behavior. */
function phaseC(phaseAResults: SmallSignalResult[]): {
  sensitivityProfile: Array<{ range: string; value: number }>;
  sensitivityBehavior: string;
} {
  const profile: Array<{ range: string; value: number }> = [];
  const si0 = phaseAResults[0].stabilityIndexMean;
  for (let i = 1; i < phaseAResults.length; i++) {
    const prev = phaseAResults[i - 1];
    const curr = phaseAResults[i];
    const deltaPct = curr.perturbationPct - prev.perturbationPct;
    const deltaSI = si0 - curr.stabilityIndexMean;
    const sensitivity = deltaPct > 0 ? deltaSI / (deltaPct / 100) : 0;
    profile.push({
      range: String(prev.perturbationPct) + '-' + String(curr.perturbationPct) + '%',
      value: sensitivity,
    });
  }
  const firstHalf = profile.slice(0, Math.floor(profile.length / 2));
  const secondHalf = profile.slice(Math.floor(profile.length / 2));
  const meanFirst = mean(firstHalf.map((p) => p.value));
  const meanSecond = mean(secondHalf.map((p) => p.value));
  let sensitivityBehavior: string;
  if (meanSecond > meanFirst * 1.1) sensitivityBehavior = 'SUPERLINEAR';
  else if (meanSecond < meanFirst * 0.9) sensitivityBehavior = 'SUBLINEAR';
  else sensitivityBehavior = 'LINEAR';
  return Object.freeze({ sensitivityProfile: profile, sensitivityBehavior });
}

/** Phase D: Lyapunov-like proxy ln(|ΔSI_next / ΔSI_current|). */
function phaseD(phaseAResults: SmallSignalResult[]): { lyapunovProxyMean: number; lyapunovInterpretation: string } {
  const deltas: number[] = [];
  for (let i = 0; i < phaseAResults.length - 1; i++) {
    deltas.push(phaseAResults[i + 1].stabilityIndexMean - phaseAResults[i].stabilityIndexMean);
  }
  const ratios: number[] = [];
  for (let i = 1; i < deltas.length; i++) {
    const current = deltas[i - 1];
    const next = deltas[i];
    if (Math.abs(current) >= 1e-10) {
      const ratio = next / current;
      ratios.push(Math.log(Math.abs(ratio) + 1e-10));
    }
  }
  const lyapunovProxyMean = ratios.length > 0 ? mean(ratios) : 0;
  let lyapunovInterpretation: string;
  if (lyapunovProxyMean < -0.1) lyapunovInterpretation = 'CONVERGENT';
  else if (lyapunovProxyMean <= 0.1) lyapunovInterpretation = 'MARGINAL';
  else lyapunovInterpretation = 'DIVERGENT';
  return Object.freeze({ lyapunovProxyMean, lyapunovInterpretation });
}

/**
 * Run S-6B Regime Characterization. Controlled incremental perturbations only.
 * No feedback, no carry-over, no recovery penalty, no disabled protections.
 */
export function RunS6BRegimeCharacterization(): {
  phaseAResults: SmallSignalResult[];
  dampingCoefficient: number;
  systemClassification: string;
  sensitivityProfile: Array<{ range: string; value: number }>;
  sensitivityBehavior: string;
  lyapunovProxyMean: number;
  lyapunovInterpretation: string;
  stabilityMarginEstimate: string;
  intrinsicInstabilityDetected: boolean;
  runawayRequiresExternalFeedback: boolean;
} {
  const out = typeof process !== 'undefined' ? process.stdout : null;
  const riskConfig = createRiskConfig({
    baseSeed: BASE_SEED,
    numberOfSeeds: SEEDS_PER_STEP,
    maxTicks: BigInt(DURATION_PHASE_A),
    messageCount: 5000,
  });

  const progressLog = out
    ? (msg: string) => {
        out.write(msg);
      }
    : undefined;

  if (out) {
    out.write('\n----------------------------------------------------------\n');
    out.write('S-6B REGIME CHARACTERIZATION REPORT\n');
    out.write('----------------------------------------------------------\n\n');
    out.write('Avvio Phase A (Small Signal Stability)...\n');
  }

  const phaseAResults = phaseA(riskConfig, progressLog);

  if (out) {
    out.write('Small Signal Stability:\n');
    for (const r of phaseAResults) {
      out.write(
        'Perturbation ' +
          String(r.perturbationPct) +
          '%  | SI=' +
          r.stabilityIndexMean.toFixed(3) +
          ' | Var=' +
          r.stabilityIndexVariance.toFixed(4) +
          ' | Lat=' +
          r.maxLatency.toFixed(2) +
          ' | Recovery=' +
          String(r.recoveryTime) +
          ' | Status=' +
          r.envelopeStatus +
          '\n',
      );
    }
    out.write('\n');
  }

  if (out) out.write('\nAvvio Phase B (Damping Estimation)...\n');
  const phaseBResult = phaseB(riskConfig, progressLog);

  if (out) {
    out.write(
      'DampingCoefficient = ' +
        phaseBResult.dampingCoefficient.toFixed(4) +
        '\n' +
        'SystemClassification = ' +
        phaseBResult.systemClassification +
        '\n\n',
    );
  }

  const phaseCResult = phaseC(phaseAResults);

  if (out) {
    out.write('SensitivityIndexProfile:\n');
    for (const p of phaseCResult.sensitivityProfile) {
      out.write(p.range + '  = ' + p.value.toFixed(4) + '\n');
    }
    out.write('SensitivityBehavior = ' + phaseCResult.sensitivityBehavior + '\n\n');
  }

  const phaseDResult = phaseD(phaseAResults);

  if (out) {
    out.write(
      'LyapunovProxyMean = ' +
        phaseDResult.lyapunovProxyMean.toFixed(4) +
        '\n' +
        'LyapunovInterpretation = ' +
        phaseDResult.lyapunovInterpretation +
        '\n\n',
    );
  }

  const criticalPct = phaseAResults.find((r) => r.envelopeStatus === 'CRITICAL')?.perturbationPct ?? null;
  const stabilityMarginEstimate =
    criticalPct !== null ? String(criticalPct) + '%' : '>' + String(PERTURBATION_LEVELS_PCT[PERTURBATION_LEVELS_PCT.length - 1]) + '%';
  const intrinsicInstabilityDetected = criticalPct !== null && criticalPct <= 20;
  const runawayRequiresExternalFeedback = !intrinsicInstabilityDetected;

  if (out) {
    out.write(
      'StabilityMarginEstimate = ' +
        stabilityMarginEstimate +
        ' (perturbation before runaway)\n' +
        'IntrinsicInstabilityDetected = ' +
        (intrinsicInstabilityDetected ? 'YES' : 'NO') +
        '\n' +
        'RunawayRequiresExternalFeedback = ' +
        (runawayRequiresExternalFeedback ? 'YES' : 'NO') +
        '\n\n----------------------------------------------------------\n',
    );
  }

  return Object.freeze({
    phaseAResults,
    dampingCoefficient: phaseBResult.dampingCoefficient,
    systemClassification: phaseBResult.systemClassification,
    sensitivityProfile: phaseCResult.sensitivityProfile,
    sensitivityBehavior: phaseCResult.sensitivityBehavior,
    lyapunovProxyMean: phaseDResult.lyapunovProxyMean,
    lyapunovInterpretation: phaseDResult.lyapunovInterpretation,
    stabilityMarginEstimate,
    intrinsicInstabilityDetected,
    runawayRequiresExternalFeedback,
  });
}

const isProbeMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.includes('S6BRegimeCharacterization') ?? false);
if (isProbeMain) {
  RunS6BRegimeCharacterization();
  process.exit(0);
}
