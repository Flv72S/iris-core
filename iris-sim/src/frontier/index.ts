/**
 * S-5B — Deterministic Adaptive Frontier Discovery. Entry point.
 */

import { createFrontierConfig } from './core/FrontierConfig.js';
import { runFrontierDiscovery } from './core/FrontierRunner.js';
import { formatFrontierReport } from './reporting/FrontierReport.js';
import { computeFrontierHash } from './reporting/FrontierReportHasher.js';

function main(): number {
  const config = createFrontierConfig();
  const result = runFrontierDiscovery(config);
  const frontierHash = computeFrontierHash(result);
  const exitCode = result.frontierDetected ? 1 : 0;
  const report = formatFrontierReport(result, config.seedsPerConfig, frontierHash, exitCode);

  const out = typeof process !== 'undefined' ? process.stdout : null;
  if (out) out.write(report + '\n');

  return exitCode;
}

const exitCode = main();
process.exit(exitCode);

export { createFrontierConfig } from './core/FrontierConfig.js';
export { runFrontierDiscovery } from './core/FrontierRunner.js';
export { formatFrontierReport } from './reporting/FrontierReport.js';
export { computeFrontierHash } from './reporting/FrontierReportHasher.js';
