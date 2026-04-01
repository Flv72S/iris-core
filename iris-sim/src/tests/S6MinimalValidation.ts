/**
 * S-6 Minimal Validation — Single-config sanity check for degradation layer.
 * Deterministic, no threshold changes. Diagnostic only.
 */

import { createHash } from 'crypto';
import { generateSeeds } from '../risk/core/SeedGenerator.js';
import { runOneSeedForConfig } from '../exploration/core/ExplorationRunner.js';
import type { ParameterConfig } from '../exploration/core/ExplorationTypes.js';
import type { SeedResult } from '../risk/core/RiskTypes.js';
import { aggregateSeedResults } from '../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../risk/aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../risk/aggregation/RiskEnvelope.js';
import { createRiskConfig } from '../risk/core/RiskConfig.js';

const NODE_COUNT = 800;
const INTENSITY = 1.1;
const DURATION_TICKS = 2000;
const SEEDS_COUNT = 10;
const BASE_SEED = 's6-minimal-validation';

function computeValidationHash(
  paramConfig: ParameterConfig,
  aggregatedDrops: number,
  aggregatedSaturation: number,
  aggregatedLatency: number,
  perSeedStabilityIndices: ReadonlyArray<{ seed: string; stabilityIndex: number }>,
  riskEnvelope: string,
): string {
  const paramPayload = [
    String(paramConfig.nodeCount),
    String(paramConfig.intensity),
    String(paramConfig.duration),
  ].join('|');
  const degPayload = [String(aggregatedDrops), String(aggregatedSaturation), String(aggregatedLatency)].join('|');
  const sorted = [...perSeedStabilityIndices].sort((a, b) => (a.seed < b.seed ? -1 : a.seed > b.seed ? 1 : 0));
  const seedPayload = sorted.map((s) => s.seed + ':' + String(s.stabilityIndex)).join('\n');
  const payload = paramPayload + '\n---\n' + degPayload + '\n---\n' + seedPayload + '\n---\n' + riskEnvelope;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

function main(): number {
  const paramConfig: ParameterConfig = Object.freeze({
    nodeCount: NODE_COUNT,
    intensity: INTENSITY,
    duration: DURATION_TICKS,
  });
  const seeds = generateSeeds(BASE_SEED, SEEDS_COUNT);
  const messageCount = Math.max(100, Math.floor(5000 * INTENSITY));
  const riskConfig = createRiskConfig({
    baseSeed: BASE_SEED,
    numberOfSeeds: SEEDS_COUNT,
    maxTicks: BigInt(DURATION_TICKS),
    messageCount,
  });

  const seedResults: SeedResult[] = [];
  for (const seed of seeds) {
    seedResults.push(runOneSeedForConfig(seed, paramConfig));
  }

  const aggregated = aggregateSeedResults(seedResults);
  const stabilityIndex = computeStabilityIndex(aggregated, riskConfig);
  const riskEnvelope = classifyRiskEnvelope(aggregated, riskConfig);

  const maxDrops = aggregated.maxDegradationDrops ?? 0;
  const maxSaturation = aggregated.maxDegradationSaturationEvents ?? 0;
  const maxLatency = aggregated.maxDegradationLatencyMultiplier ?? 0;
  let maxQueueObserved = 0;
  for (const r of seedResults) {
    const q = r.degradationMetrics?.maxQueueSizeObserved ?? 0;
    if (q > maxQueueObserved) maxQueueObserved = q;
  }

  const perSeedSummary: Array<{ seed: string; stabilityIndex: number; drops: number; saturation: number; latency: number; envelope: string }> = [];
  for (const r of seedResults) {
    const singleAgg = aggregateSeedResults([r]);
    const si = computeStabilityIndex(singleAgg, riskConfig);
    const env = classifyRiskEnvelope(singleAgg, riskConfig);
    const dm = r.degradationMetrics;
    perSeedSummary.push({
      seed: r.seed,
      stabilityIndex: si,
      drops: dm?.totalDroppedMessages ?? 0,
      saturation: dm?.saturationEventCount ?? 0,
      latency: dm?.maxLatencyMultiplier ?? 0,
      envelope: env,
    });
  }

  const validationHash = computeValidationHash(
    paramConfig,
    maxDrops,
    maxSaturation,
    maxLatency,
    perSeedSummary.map((s) => ({ seed: s.seed, stabilityIndex: s.stabilityIndex })),
    riskEnvelope,
  );

  const out = typeof process !== 'undefined' ? process.stdout : null;
  const lines: string[] = [
    '----------------------------------------------------------',
    'S-6 MINIMAL VALIDATION REPORT',
    '----------------------------------------------------------',
    '',
    'NodeCount: ' + String(NODE_COUNT),
    'Intensity: ' + String(INTENSITY),
    'Duration: ' + String(DURATION_TICKS),
    'Seeds: ' + String(SEEDS_COUNT),
    '',
    'Aggregated StabilityIndex: ' + stabilityIndex.toFixed(4),
    'Risk Envelope: ' + riskEnvelope,
    '',
    'Degradation Metrics (Aggregated Max Across Seeds):',
    '',
    'Max Queue Size Observed: ' + String(maxQueueObserved),
    'Total Dropped Messages: ' + String(maxDrops),
    'Max Saturation Events: ' + String(maxSaturation),
    'Max Latency Multiplier: ' + String(maxLatency),
    '',
    '----------------------------------------------------------',
    'Per-Seed Summary',
    '----------------------------------------------------------',
    '',
  ];
  for (const s of perSeedSummary) {
    lines.push('Seed: ' + s.seed);
    lines.push('StabilityIndex: ' + s.stabilityIndex.toFixed(4));
    lines.push('Drops: ' + String(s.drops));
    lines.push('SaturationEvents: ' + String(s.saturation));
    lines.push('LatencyMultiplier: ' + String(s.latency));
    lines.push('Envelope: ' + s.envelope);
    lines.push('');
  }
  lines.push('----------------------------------------------------------');
  lines.push('Validation Hash: ' + validationHash);
  lines.push('----------------------------------------------------------');

  if (out) out.write(lines.join('\n') + '\n');

  const degradationObserved =
    maxDrops > 0 ||
    maxSaturation > 0 ||
    maxLatency > 1.5 ||
    stabilityIndex < 0.95 ||
    riskEnvelope === 'STRESS' ||
    riskEnvelope === 'CRITICAL';

  return degradationObserved ? 0 : 1;
}

const exitCode = main();
process.exit(exitCode);
