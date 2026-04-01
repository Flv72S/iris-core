/**
 * S-6A — Supercritical load dynamics. Positive Congestion Feedback (PCF) exploration.
 * Optional extension: alpha=0 reproduces S-5F baseline; alpha>0 enables possible runaway.
 */

import { runOneSeedForConfig } from './core/ExplorationRunner.js';
import type { ParameterConfig, ParameterResult } from './core/ExplorationTypes.js';
import { generateSeeds } from '../risk/core/SeedGenerator.js';
import { aggregateSeedResults } from '../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../risk/aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../risk/aggregation/RiskEnvelope.js';
import { createRiskConfig } from '../risk/core/RiskConfig.js';
import { computeRiskReportHash } from '../risk/reporting/RiskReportHasher.js';
import type { SeedResult } from '../risk/core/RiskTypes.js';
import type { DegradationConfig } from '../degradation/core/DegradationConfig.js';

const BASE_SEED = 's6a-supercritical-exploration-base-seed';
const SEEDS = 3;
const NODE_COUNT = 1500;
const INTENSITY = 1.5;
const DURATION = 20000;

const ALPHA_VALUES = [0, 0.5, 1.0, 1.5, 2.0];

function runWithAlpha(
  alpha: number,
  riskConfig: ReturnType<typeof createRiskConfig>,
): ParameterResult {
  const config: ParameterConfig = Object.freeze({
    nodeCount: NODE_COUNT,
    intensity: INTENSITY,
    duration: DURATION,
  });
  const overrides: Partial<DegradationConfig> = { positiveCongestionAlpha: alpha };
  const seeds = generateSeeds(BASE_SEED, SEEDS);
  const seedResults: SeedResult[] = seeds.map((seed) => runOneSeedForConfig(seed, config, overrides));
  const aggregated = aggregateSeedResults(seedResults);
  const stabilityIndex = computeStabilityIndex(aggregated, riskConfig);
  const riskEnvelope = classifyRiskEnvelope(aggregated, riskConfig);

  let maxLatency = 0;
  let maxDrops = 0;
  let maxSaturation = 0;
  for (const r of seedResults) {
    const dm = r.degradationMetrics;
    if (dm) {
      if ((dm.maxLatencyMultiplier ?? 0) > maxLatency) maxLatency = dm.maxLatencyMultiplier ?? 0;
      if ((dm.totalDroppedMessages ?? 0) > maxDrops) maxDrops = dm.totalDroppedMessages ?? 0;
      if ((dm.saturationEventCount ?? 0) > maxSaturation) maxSaturation = dm.saturationEventCount ?? 0;
    }
  }

  const riskReportHash = computeRiskReportHash(seedResults, aggregated, stabilityIndex, riskEnvelope);
  return Object.freeze({
    config,
    stabilityIndex,
    safetyFailureRate: aggregated.safetyFailureRate,
    livenessFailureRate: aggregated.livenessFailureRate,
    riskEnvelope,
    maxSoftEvents: aggregated.maxSoftEventsObserved,
    maxLivenessDelay: aggregated.maxLivenessDelay,
    riskReportHash,
    maxDegradationDrops: maxDrops,
    maxDegradationSaturationEvents: maxSaturation,
    maxDegradationLatencyMultiplier: maxLatency,
  });
}

function formatResult(r: ParameterResult): string {
  const lat = (r as ParameterResult & { maxDegradationLatencyMultiplier?: number }).maxDegradationLatencyMultiplier ?? 0;
  const drops = (r as ParameterResult & { maxDegradationDrops?: number }).maxDegradationDrops ?? 0;
  const sat = (r as ParameterResult & { maxDegradationSaturationEvents?: number }).maxDegradationSaturationEvents ?? 0;
  return (
    r.riskEnvelope +
    ' | StabilityIndex=' +
    r.stabilityIndex.toFixed(2) +
    ' | MaxLatencyMult=' +
    String(lat) +
    ' | Drops=' +
    String(drops) +
    ' | SaturationEvents=' +
    String(sat)
  );
}

function main(): number {
  const out = typeof process !== 'undefined' ? process.stdout : null;
  const riskConfig = createRiskConfig({
    baseSeed: BASE_SEED,
    numberOfSeeds: SEEDS,
    maxTicks: BigInt(DURATION),
    messageCount: 5000,
  });

  let criticalObserved = false;
  let criticalAlpha: number | null = null;

  if (out) {
    out.write(
      '\n----------------------------------------------------------\n' +
        'S-6A SUPERCRITICAL LOAD EXPLORATION REPORT\n' +
        '----------------------------------------------------------\n\n',
    );
  }

  for (let ai = 0; ai < ALPHA_VALUES.length; ai++) {
    const alpha = ALPHA_VALUES[ai];
    if (out) out.write('S-6A Progress: Alpha ' + String(alpha) + ' (' + String(ai + 1) + '/' + String(ALPHA_VALUES.length) + ') running...\n');
    const result = runWithAlpha(alpha, riskConfig);
    if (result.riskEnvelope === 'CRITICAL') {
      criticalObserved = true;
      criticalAlpha = alpha;
    }
    if (out) out.write('Alpha = ' + String(alpha) + '\nResult: ' + formatResult(result) + '\n\n');
    if (criticalObserved) {
      if (out) out.write('CRITICAL EMERGED AT ALPHA = ' + String(criticalAlpha) + '\n\n');
      break;
    }
  }

  if (out) out.write('----------------------------------------------------------\n');

  return criticalObserved ? 1 : 0;
}

const exitCode = main();
process.exit(exitCode);
