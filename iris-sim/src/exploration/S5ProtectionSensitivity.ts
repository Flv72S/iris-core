/**
 * S-5F — Protection sensitivity decomposition. Controlled toggles only; no permanent logic changes.
 *
 * PROTECTION MECHANISMS IDENTIFIED IN CODEBASE:
 * - Latency cap: DegradationEngine.ts — latencyMultiplier capped at Math.min(5, ...) to bound delivery delay growth.
 * - Queue backpressure: BackpressureModel.ts + DegradationEngine — when outbound queue exceeds threshold (0.8 * maxQueueSizePerNode),
 *   capacity multiplier and latency delta are applied; upstream backpressure propagated to senders.
 * - Saturation guard: QueueModel.ts — saturationEvent when queue.length > maxQueueSizePerNode; DegradationEngine uses
 *   backpressure-derived effectiveCapacity to limit processing (capacity multiplier, upstream cap).
 * - Load shedding: DeterministicDropModel.ts + DegradationEngine — deterministic drops in correlated failure window.
 * - Bounded growth: DegradationConfig.maxQueueSizePerNode (500), BackpressureModel capacityMultiplier Math.max(0.2, 1 - ratio*0.8),
 *   latency delta ratio * 0.5, backpressureLevel Math.min(10, ...).
 * (No separate smoothing/damping factor; congestionLatencyFactor 0.5 in LatencyAmplifier.)
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

const BASE_SEED = 's5f-protection-sensitivity-base-seed';
const SEEDS = 3;
const NODE_COUNT = 1500;
const INTENSITY = 1.5;
const DURATION = 20000;

/** Local overrides for this test only; passed to simulation runtime via degradationConfig. */
const protectionOverrides = {
  disableLatencyCap: false,
  disableBackpressure: false,
  disableSaturationGuard: false,
};

function runWithOverrides(
  overrides: Partial<DegradationConfig>,
  riskConfig: ReturnType<typeof createRiskConfig>,
): ParameterResult {
  const config: ParameterConfig = Object.freeze({
    nodeCount: NODE_COUNT,
    intensity: INTENSITY,
    duration: DURATION,
  });
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

  if (out) {
    out.write(
      '\n----------------------------------------------------------\n' +
        'S-5F PROTECTION SENSITIVITY REPORT\n' +
        '----------------------------------------------------------\n\n',
    );
    out.write('Configuration 1: Baseline (running...)\n');
  }

  const r1 = runWithOverrides(protectionOverrides, riskConfig);
  if (r1.riskEnvelope === 'CRITICAL') criticalObserved = true;
  if (out) out.write('Configuration 1: Baseline\nResult: ' + formatResult(r1) + '\n\n');
  if (criticalObserved) {
    if (out) out.write('Interpretation:\n- CRITICAL observed. Stopped.\n\n----------------------------------------------------------\n');
    return 1;
  }

  const r2 = runWithOverrides({ disableLatencyCap: true }, riskConfig);
  if (r2.riskEnvelope === 'CRITICAL') criticalObserved = true;
  if (out) out.write('Configuration 2: No Latency Cap\nResult: ' + formatResult(r2) + '\n\n');
  if (criticalObserved) {
    if (out) out.write('Interpretation:\n- CRITICAL observed. Stopped.\n\n----------------------------------------------------------\n');
    return 1;
  }

  const r3 = runWithOverrides({ disableBackpressure: true }, riskConfig);
  if (r3.riskEnvelope === 'CRITICAL') criticalObserved = true;
  if (out) out.write('Configuration 3: No Backpressure\nResult: ' + formatResult(r3) + '\n\n');
  if (criticalObserved) {
    if (out) out.write('Interpretation:\n- CRITICAL observed. Stopped.\n\n----------------------------------------------------------\n');
    return 1;
  }

  const r4 = runWithOverrides(
    { disableLatencyCap: true, disableBackpressure: true, disableSaturationGuard: true },
    riskConfig,
  );
  if (r4.riskEnvelope === 'CRITICAL') criticalObserved = true;
  if (out) out.write('Configuration 4: All Protections Disabled\nResult: ' + formatResult(r4) + '\n\n');

  if (out) {
    out.write(
      'Interpretation:\n' +
        '- If CRITICAL only appears when protections disabled → system is robust but guarded\n' +
        '- If still no CRITICAL → structurally stable system\n' +
        '- If immediate divergence → phase boundary exists\n\n' +
        '----------------------------------------------------------\n',
    );
  }

  return criticalObserved ? 1 : 0;
}

const exitCode = main();
process.exit(exitCode);
