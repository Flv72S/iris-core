/**
 * S-5D — Directed critical search. Duration escalation only.
 * Fixed nodeCount and intensity; monotonic duration sequence. Stop on first CRITICAL.
 */

import { createHash } from 'crypto';
import { runOneSeedForConfig } from './core/ExplorationRunner.js';
import type { ParameterConfig, ParameterResult } from './core/ExplorationTypes.js';
import { generateSeeds } from '../risk/core/SeedGenerator.js';
import { aggregateSeedResults } from '../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../risk/aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../risk/aggregation/RiskEnvelope.js';
import { createRiskConfig } from '../risk/core/RiskConfig.js';
import { computeRiskReportHash } from '../risk/reporting/RiskReportHasher.js';
import type { SeedResult } from '../risk/core/RiskTypes.js';

const BASE_SEED = 's5d-directed-critical-search-base-seed';
const SEEDS_PER_DURATION = 3;

const NODE_COUNT = 1500;
const INTENSITY = 1.5;
const DURATIONS = [5000, 7000, 10000, 15000, 20000];

function runOneDuration(
  duration: number,
  riskConfig: ReturnType<typeof createRiskConfig>,
): ParameterResult {
  const config: ParameterConfig = Object.freeze({
    nodeCount: NODE_COUNT,
    intensity: INTENSITY,
    duration,
  });
  const seeds = generateSeeds(BASE_SEED, SEEDS_PER_DURATION);
  const seedResults: SeedResult[] = seeds.map((seed) => runOneSeedForConfig(seed, config));
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

  return Object.freeze({
    config,
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
  });
}

function computeS5DExplorationHash(
  results: readonly ParameterResult[],
  nodeCount: number,
  intensity: number,
  durationList: number[],
  seedCount: number,
): string {
  const payload =
    String(nodeCount) +
    '|' +
    String(intensity) +
    '|' +
    durationList.join(',') +
    '|' +
    String(seedCount) +
    '\n---\n' +
    results.map((r) => String(r.config.duration) + '|' + r.riskEnvelope + '|' + String(r.stabilityIndex)).join('\n');
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

function main(): number {
  const out = typeof process !== 'undefined' ? process.stdout : null;
  const riskConfig = createRiskConfig({
    baseSeed: BASE_SEED,
    numberOfSeeds: SEEDS_PER_DURATION,
    maxTicks: 20000n,
    messageCount: 5000,
  });

  const results: ParameterResult[] = [];
  let firstCriticalDuration: number | null = null;
  let totalSafe = 0;
  let totalStress = 0;
  let totalCritical = 0;
  let maxLatencyMultiplier = 0;
  let maxDrops = 0;
  let maxSaturation = 0;

  for (let i = 0; i < DURATIONS.length; i++) {
    const duration = DURATIONS[i];
    const result = runOneDuration(duration, riskConfig);

    const r = result as ParameterResult & {
      maxDegradationDrops?: number;
      maxDegradationSaturationEvents?: number;
      maxDegradationLatencyMultiplier?: number;
    };
    if (r.maxDegradationLatencyMultiplier !== undefined && r.maxDegradationLatencyMultiplier > maxLatencyMultiplier) {
      maxLatencyMultiplier = r.maxDegradationLatencyMultiplier;
    }
    if (r.maxDegradationDrops !== undefined && r.maxDegradationDrops > maxDrops) maxDrops = r.maxDegradationDrops;
    if (r.maxDegradationSaturationEvents !== undefined && r.maxDegradationSaturationEvents > maxSaturation) {
      maxSaturation = r.maxDegradationSaturationEvents;
    }

    if (result.riskEnvelope === 'SAFE') totalSafe += 1;
    else if (result.riskEnvelope === 'STRESS') totalStress += 1;
    else totalCritical += 1;

    results.push(result);

    if (out) {
      out.write(
        'S-5D Duration Test: duration=' +
          String(duration) +
          '\nResult -> ' +
          result.riskEnvelope +
          ' (' +
          result.stabilityIndex.toFixed(2) +
          ')\n',
      );
    }

    if (result.riskEnvelope === 'CRITICAL') {
      firstCriticalDuration = duration;
      if (out) {
        out.write('CRITICAL FOUND\nduration=' + String(duration) + '\n');
      }
      break;
    }
  }

  const explorationHash = computeS5DExplorationHash(
    results,
    NODE_COUNT,
    INTENSITY,
    DURATIONS,
    SEEDS_PER_DURATION,
  );

  if (out) {
    out.write(
      '\n----------------------------------------------------------\n' +
        'S-5D DIRECTED CRITICAL SEARCH REPORT\n' +
        '----------------------------------------------------------\n\n' +
        'Durations Tested: ' +
        DURATIONS.slice(0, results.length).join(', ') +
        '\n' +
        'SAFE Count: ' +
        String(totalSafe) +
        '\n' +
        'STRESS Count: ' +
        String(totalStress) +
        '\n' +
        'CRITICAL Count: ' +
        String(totalCritical) +
        '\n\n' +
        'First CRITICAL Duration: ' +
        (firstCriticalDuration !== null ? String(firstCriticalDuration) : '(none)') +
        '\n\n' +
        'Max Observed Latency Multiplier: ' +
        String(maxLatencyMultiplier) +
        '\n' +
        'Max Observed Drops: ' +
        String(maxDrops) +
        '\n' +
        'Max Observed Saturation Events: ' +
        String(maxSaturation) +
        '\n\n' +
        'Exploration Hash: ' +
        explorationHash +
        '\n' +
        'Exit Code: ' +
        String(firstCriticalDuration !== null ? 1 : 0) +
        '\n\n----------------------------------------------------------\n',
    );
  }

  return firstCriticalDuration !== null ? 1 : 0;
}

const exitCode = main();
process.exit(exitCode);
