/**
 * S-5C — Critical frontier expansion. Deterministic, bounded.
 * Extends S-5B: search for first CRITICAL boundary without changing thresholds or degradation.
 */

import { createHash } from 'crypto';
import { buildParameterGrid } from './core/ParameterGrid.js';
import { runOneSeedForConfig } from './core/ExplorationRunner.js';
import { parameterConfigKey } from './core/ParameterConfig.js';
import type { ParameterConfig, ParameterResult } from './core/ExplorationTypes.js';
import { generateSeeds } from '../risk/core/SeedGenerator.js';
import { aggregateSeedResults } from '../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../risk/aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../risk/aggregation/RiskEnvelope.js';
import { createRiskConfig } from '../risk/core/RiskConfig.js';
import { computeRiskReportHash } from '../risk/reporting/RiskReportHasher.js';
import type { SeedResult } from '../risk/core/RiskTypes.js';

const BASE_SEED = 's5c-critical-expansion-base-seed';
const SEEDS_PER_CONFIG = 5;

const NODE_COUNTS = [750, 1000, 1500, 2000];
const INTENSITIES = [1.1, 1.3, 1.5];
const DURATIONS = [2000, 3000, 4000];

const TOTAL_GRID = NODE_COUNTS.length * INTENSITIES.length * DURATIONS.length;

function runOneConfig(
  config: ParameterConfig,
  riskConfig: ReturnType<typeof createRiskConfig>,
): ParameterResult {
  const seeds = generateSeeds(BASE_SEED, SEEDS_PER_CONFIG);
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

function computeS5CExplorationHash(
  results: readonly ParameterResult[],
  gridDef: { nodeCounts: number[]; intensities: number[]; durations: number[] },
  seedCount: number,
): string {
  const sorted = [...results].sort((a, b) => {
    const ka = parameterConfigKey(a.config);
    const kb = parameterConfigKey(b.config);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const gridPayload = [
    gridDef.nodeCounts.join(','),
    gridDef.intensities.join(','),
    gridDef.durations.join(','),
    String(seedCount),
  ].join('|');
  const lines = sorted.map((r) => [parameterConfigKey(r.config), r.riskEnvelope, String(r.stabilityIndex)].join('|'));
  const payload = gridPayload + '\n---\n' + lines.join('\n');
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

function main(): number {
  const out = typeof process !== 'undefined' ? process.stdout : null;
  const riskConfig = createRiskConfig({
    baseSeed: BASE_SEED,
    numberOfSeeds: SEEDS_PER_CONFIG,
    maxTicks: 4000n,
    messageCount: 5000,
  });

  const grid = buildParameterGrid(NODE_COUNTS, INTENSITIES, DURATIONS);
  const results: ParameterResult[] = [];
  let firstCritical: ParameterConfig | null = null;
  let totalSafe = 0;
  let totalStress = 0;
  let totalCritical = 0;
  let maxLatencyMultiplier = 0;
  let maxDrops = 0;
  let maxSaturation = 0;

  for (let i = 0; i < grid.length; i++) {
    const config = grid[i];
    const result = runOneConfig(config, riskConfig);

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
        'S-5C Progress: Config ' +
          String(i + 1) +
          '/' +
          String(TOTAL_GRID) +
          '\n(node=' +
          String(config.nodeCount) +
          ', intensity=' +
          String(config.intensity) +
          ', duration=' +
          String(config.duration) +
          ') -> ' +
          result.riskEnvelope +
          ' (' +
          result.stabilityIndex.toFixed(2) +
          ')\n',
      );
    }

    if (result.riskEnvelope === 'CRITICAL') {
      firstCritical = config;
      if (out) {
        out.write('CRITICAL FOUND\n');
        out.write('Configuration: (' + String(config.nodeCount) + ', ' + String(config.intensity) + ', ' + String(config.duration) + ')\n');
      }
      break;
    }
  }

  const explorationHash = computeS5CExplorationHash(
    results,
    { nodeCounts: NODE_COUNTS, intensities: INTENSITIES, durations: DURATIONS },
    SEEDS_PER_CONFIG,
  );

  if (out) {
    out.write(
      '\n----------------------------------------------------------\n' +
        'S-5C CRITICAL FRONTIER REPORT\n' +
        '----------------------------------------------------------\n\n' +
        'Total Configurations Evaluated: ' +
        String(results.length) +
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
        'First CRITICAL Configuration:\n' +
        (firstCritical
          ? '(' +
            String(firstCritical.nodeCount) +
            ', ' +
            String(firstCritical.intensity) +
            ', ' +
            String(firstCritical.duration) +
            ')\n'
          : '(none)\n') +
        '\nMax Observed Latency Multiplier: ' +
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
        String(firstCritical ? 1 : 0) +
        '\n\n----------------------------------------------------------\n',
    );
  }

  return firstCritical ? 1 : 0;
}

const exitCode = main();
process.exit(exitCode);
