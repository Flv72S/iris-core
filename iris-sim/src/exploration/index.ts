/**
 * S-5 — Parameter space exploration. Entry point.
 */

import { buildParameterGrid } from './core/ParameterGrid.js';
import { runExploration } from './core/ExplorationRunner.js';
import { buildStabilitySurface, getSurfaceEntriesSorted } from './mapping/StabilitySurface.js';
import { computeFragilityBoundaries } from './mapping/FragilityAnalyzer.js';
import { createExplorationReport, formatExplorationReport } from './reporting/ExplorationReport.js';
import { computeExplorationHash } from './reporting/ExplorationReportHasher.js';

const BASE_SEED = 's5-exploration-base-seed';
const SEEDS_PER_CONFIG = 10;

function main(): number {
  const nodeCounts = [100, 250, 500];
  const intensities = [0.3, 0.6, 0.9];
  const durations = [500, 1000, 1500];

  const grid = buildParameterGrid(nodeCounts, intensities, durations);

  const out = typeof process !== 'undefined' ? process.stdout : null;
  const results = runExploration(grid, {
    baseSeed: BASE_SEED,
    seedsPerConfig: SEEDS_PER_CONFIG,
    onConfigProgress: (completed, total) => {
      if (out) out.write('S-5 Progress: Config ' + String(completed) + '/' + String(total) + '\n');
    },
  });

  const boundaries = computeFragilityBoundaries(results);
  const surface = buildStabilitySurface(results);
  const explorationHash = computeExplorationHash(results, boundaries);
  const report = createExplorationReport(results.length, SEEDS_PER_CONFIG, boundaries, explorationHash);

  const surfaceLines = getSurfaceEntriesSorted(surface).map(([key, point]) => {
    const [node, intensity, duration] = key.split(':');
    return '(node=' + node + ', intensity=' + intensity + ', duration=' + duration + ') -> ' + point.envelope + ' (' + point.stabilityIndex.toFixed(2) + ')';
  });

  if (out) out.write(formatExplorationReport(report, surfaceLines) + '\n');

  return boundaries.criticalBoundaryDetected ? 1 : 0;
}

const exitCode = main();
process.exit(exitCode);

export { buildParameterGrid } from './core/ParameterGrid.js';
export { runExploration, runOneSeedForConfig } from './core/ExplorationRunner.js';
export { buildStabilitySurface, getSurfaceEntriesSorted } from './mapping/StabilitySurface.js';
export { computeFragilityBoundaries } from './mapping/FragilityAnalyzer.js';
export { classifyRegion } from './mapping/RegionClassifier.js';
export { createExplorationReport, formatExplorationReport } from './reporting/ExplorationReport.js';
export { computeExplorationHash } from './reporting/ExplorationReportHasher.js';
export type { ParameterConfig, ParameterResult, RegionClassification } from './core/ExplorationTypes.js';
