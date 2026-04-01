/**
 * S-4 — Deterministic multi-seed risk quantification. Entry point.
 */

import { createRiskConfig } from './core/RiskConfig.js';
import { runRiskQuantification } from './core/RiskEngine.js';
import { formatRiskReport } from './reporting/RiskReport.js';

function main(): number {
  const config = createRiskConfig({
    baseSeed: 's4-risk-base-seed',
    numberOfSeeds: 20,
    scenarioName: 'EnterpriseStress',
    maxTicks: 1500n,
    messageCount: 5000,
  });

  const out = typeof process !== 'undefined' ? process.stdout : null;
  const { report } = runRiskQuantification(config, {
    onProgress: (completed, total) => {
      if (out) out.write('S-4 Progress: Seed ' + String(completed) + '/' + String(total) + '\n');
    },
  });

  if (out) out.write(formatRiskReport(report) + '\n');

  const safe =
    report.safetyFailureRate === 0 && report.livenessFailureRate === 0;
  return safe ? 0 : 1;
}

const exitCode = main();
process.exit(exitCode);

export { runRiskQuantification } from './core/RiskEngine.js';
export { generateSeeds } from './core/SeedGenerator.js';
export { runOneSeed, runAllSeeds } from './core/MultiSeedRunner.js';
export { aggregateSeedResults } from './aggregation/RiskAggregator.js';
export { computeStabilityIndex } from './aggregation/StabilityIndexCalculator.js';
export { classifyRiskEnvelope } from './aggregation/RiskEnvelope.js';
export { createRiskReport, formatRiskReport } from './reporting/RiskReport.js';
export { computeRiskReportHash } from './reporting/RiskReportHasher.js';
export { createRiskConfig, DEFAULT_RISK_CONFIG } from './core/RiskConfig.js';
export type { RiskConfig } from './core/RiskConfig.js';
export type { SeedResult, AggregatedRiskMetrics, RiskEnvelopeClassification } from './core/RiskTypes.js';
export type { RiskReport } from './reporting/RiskReport.js';
