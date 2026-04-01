/**
 * S-4 — Risk quantification engine. Orchestrates multi-seed runs, aggregation, report.
 */

import type { RiskConfig } from './RiskConfig.js';
import type { SeedResult } from './RiskTypes.js';
import type { RiskReport } from '../reporting/RiskReport.js';
import { generateSeeds } from './SeedGenerator.js';
import { runOneSeed } from './MultiSeedRunner.js';
import { aggregateSeedResults } from '../aggregation/RiskAggregator.js';
import { computeStabilityIndex } from '../aggregation/StabilityIndexCalculator.js';
import { classifyRiskEnvelope } from '../aggregation/RiskEnvelope.js';
import { createRiskReport } from '../reporting/RiskReport.js';
import { computeRiskReportHash } from '../reporting/RiskReportHasher.js';

export interface RiskQuantificationOptions {
  readonly onProgress?: (completed: number, total: number) => void;
}

export function runRiskQuantification(
  config: RiskConfig,
  options?: RiskQuantificationOptions,
): {
  seedResults: SeedResult[];
  report: RiskReport;
} {
  const seeds = generateSeeds(config.baseSeed, config.numberOfSeeds);
  const seedResults: SeedResult[] = [];
  for (let i = 0; i < seeds.length; i++) {
    seedResults.push(runOneSeed(seeds[i], config));
    options?.onProgress?.(i + 1, seeds.length);
  }
  const aggregated = aggregateSeedResults(seedResults);
  const stabilityIndex = computeStabilityIndex(aggregated, config);
  const riskEnvelope = classifyRiskEnvelope(aggregated, config);
  const riskReportHash = computeRiskReportHash(seedResults, aggregated, stabilityIndex, riskEnvelope);
  const report = createRiskReport(
    config.scenarioName,
    config.baseSeed,
    aggregated,
    stabilityIndex,
    riskEnvelope,
    riskReportHash,
  );
  return { seedResults, report };
}
