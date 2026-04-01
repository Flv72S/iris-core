/**
 * S-5E — Critical distance audit. Pure analytical instrumentation.
 * Measures how far the system is from CRITICAL in SI space. No threshold or logic changes.
 */

import { runOneSeedForConfig } from './core/ExplorationRunner.js';
import type { ParameterConfig } from './core/ExplorationTypes.js';
import { generateSeeds } from '../risk/core/SeedGenerator.js';
import { aggregateSeedResults } from '../risk/aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../risk/aggregation/StabilityIndexCalculator.js';
import { createRiskConfig } from '../risk/core/RiskConfig.js';
import type { SeedResult } from '../risk/core/RiskTypes.js';

/**
 * Conventional SI boundary for CRITICAL regime (spec example).
 * RiskEnvelope classifies CRITICAL by violations only; this value is used only for distance metrics.
 */
const CRITICAL_THRESHOLD = 0.8;

const BASE_SEED = 's5e-critical-distance-audit-base-seed';
const SEEDS = 3;
const NODE_COUNT = 1500;
const INTENSITY = 1.5;
const DURATION = 20000;
const EPSILON = 0.01;

function runStabilityIndexForConfig(
  config: ParameterConfig,
  riskConfig: ReturnType<typeof createRiskConfig>,
): number {
  const seeds = generateSeeds(BASE_SEED, SEEDS);
  const seedResults: SeedResult[] = seeds.map((seed) => runOneSeedForConfig(seed, config));
  const aggregated = aggregateSeedResults(seedResults);
  return computeStabilityIndex(aggregated, riskConfig);
}

function main(): void {
  const out = typeof process !== 'undefined' ? process.stdout : null;
  const riskConfig = createRiskConfig({
    baseSeed: BASE_SEED,
    numberOfSeeds: SEEDS,
    maxTicks: BigInt(DURATION),
    messageCount: 5000,
  });

  const config: ParameterConfig = Object.freeze({
    nodeCount: NODE_COUNT,
    intensity: INTENSITY,
    duration: DURATION,
  });

  const stabilityIndex = runStabilityIndexForConfig(config, riskConfig);
  const distanceToCritical = stabilityIndex - CRITICAL_THRESHOLD;
  const normalizedDistance = distanceToCritical / CRITICAL_THRESHOLD;

  const configPerturbed: ParameterConfig = Object.freeze({
    nodeCount: NODE_COUNT,
    intensity: INTENSITY + EPSILON,
    duration: DURATION,
  });
  const stabilityIndexPerturbed = runStabilityIndexForConfig(configPerturbed, riskConfig);
  const elasticity = (stabilityIndexPerturbed - stabilityIndex) / EPSILON;

  if (out) {
    out.write(
      '\n----------------------------------------------------------\n' +
        'S-5E CRITICAL DISTANCE AUDIT REPORT\n' +
        '----------------------------------------------------------\n\n' +
        'Configuration:\n' +
        '(node=' +
        String(NODE_COUNT) +
        ', intensity=' +
        String(INTENSITY) +
        ', duration=' +
        String(DURATION) +
        ')\n\n' +
        'StabilityIndex: ' +
        stabilityIndex.toFixed(2) +
        '\n' +
        'CRITICAL Threshold: ' +
        CRITICAL_THRESHOLD.toFixed(2) +
        '\n\n' +
        'Absolute Distance to CRITICAL: ' +
        distanceToCritical.toFixed(2) +
        '\n' +
        'Normalized Distance: ' +
        normalizedDistance.toFixed(2) +
        '\n\n' +
        'Elasticity (dSI/dIntensity): ' +
        elasticity.toFixed(2) +
        '\n\n' +
        'Interpretation:\n' +
        '- If elasticity ≈ 0 → structurally capped\n' +
        '- If elasticity < 0 but small → stable degradation regime\n' +
        '- If elasticity strongly negative → near phase boundary\n\n' +
        '----------------------------------------------------------\n',
    );
  }

  process.exit(0);
}

main();
