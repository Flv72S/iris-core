/**
 * S-5B — Orchestration: initial grid → expand loop → refine if boundary → surface.
 */

import type { FrontierConfig } from './FrontierConfig.js';
import { buildGridFromBounds, expandOneAxis } from './ExpansionStrategy.js';
import { runExploration } from '../../exploration/core/ExplorationRunner.js';
import { parameterConfigKey } from '../../exploration/core/ParameterConfig.js';
import type { ParameterConfig, ParameterResult } from '../../exploration/core/ExplorationTypes.js';
import { detectFrontier } from '../analysis/FrontierDetector.js';
import { getRefinementConfigsToRun } from '../analysis/BoundaryRefiner.js';
import { FrontierSurface } from '../analysis/FrontierSurface.js';

export interface FrontierRunnerResult {
  readonly surface: FrontierSurface;
  readonly allResults: ParameterResult[];
  readonly initialGridSize: number;
  readonly frontierDetected: boolean;
  readonly stressBoundaryDetected: boolean;
  readonly firstCriticalConfig: ParameterConfig | null;
  readonly firstStressConfig: ParameterConfig | null;
}

/**
 * Run S-5B: initial grid, deterministic expansion until boundary or max, then refinement.
 */
export function runFrontierDiscovery(config: FrontierConfig): FrontierRunnerResult {
  const allResults: ParameterResult[] = [];
  const exploredKeys = new Set<string>();

  let nodeCounts = [...config.initialNodeCounts];
  let intensities = [...config.initialIntensities];
  let durations = [...config.initialDurations];

  const out = typeof process !== 'undefined' ? process.stdout : null;

  function runConfigs(configs: ParameterConfig[], label: string): void {
    if (configs.length === 0) return;
    const toRun = configs.filter((c) => !exploredKeys.has(parameterConfigKey(c)));
    if (toRun.length === 0) return;
    const results = runExploration(toRun, {
      baseSeed: config.baseSeed,
      seedsPerConfig: config.seedsPerConfig,
      onConfigProgress: (completed, total) => {
        if (out) out.write('S-5B ' + label + ': Config ' + String(completed) + '/' + String(total) + '\n');
      },
    });
    for (const r of results) {
      exploredKeys.add(parameterConfigKey(r.config));
      allResults.push(r);
    }
  }

  const initialGrid = buildGridFromBounds(nodeCounts, intensities, durations);
  runConfigs(initialGrid, 'initial');
  const initialGridSize = initialGrid.length;

  let detection = detectFrontier(allResults);
  let expansionCycle = 0;
  let stressPrinted = false;
  let criticalPrinted = false;
  if (detection.stressBoundaryDetected && out && !stressPrinted) {
    out.write('S-5B: First STRESS detected.\n');
    stressPrinted = true;
  }
  if (detection.frontierDetected && out && !criticalPrinted) {
    out.write('S-5B: First CRITICAL detected.\n');
    criticalPrinted = true;
  }

  while (!detection.stressBoundaryDetected && !detection.frontierDetected) {
    const expanded = expandOneAxis(
      nodeCounts,
      intensities,
      durations,
      config.expansionStepNode,
      config.expansionStepIntensity,
      config.expansionStepDuration,
      config.maxNodeLimit,
      config.maxIntensityLimit,
      config.maxDurationLimit,
      expansionCycle,
    );
    if (expanded.axis === null) break;
    if (out) out.write('S-5B: Expansion (axis ' + String(expanded.axis) + ').\n');
    nodeCounts = expanded.nodeCounts;
    intensities = expanded.intensities;
    durations = expanded.durations;
    const fullGrid = buildGridFromBounds(nodeCounts, intensities, durations);
    runConfigs(fullGrid, 'expand');
    detection = detectFrontier(allResults);
    if (detection.stressBoundaryDetected && out && !stressPrinted) {
      out.write('S-5B: First STRESS detected.\n');
      stressPrinted = true;
    }
    if (detection.frontierDetected && out && !criticalPrinted) {
      out.write('S-5B: First CRITICAL detected.\n');
      criticalPrinted = true;
    }
    expansionCycle++;
  }

  for (let ref = 0; ref < config.refinementIterations; ref++) {
    const toRun = getRefinementConfigsToRun(allResults, detection, exploredKeys);
    if (toRun.length === 0) break;
    runConfigs(toRun, 'refine');
    detection = detectFrontier(allResults);
  }

  const surface = new FrontierSurface();
  surface.addAll(allResults);

  return Object.freeze({
    surface,
    allResults,
    initialGridSize,
    frontierDetected: detection.frontierDetected,
    stressBoundaryDetected: detection.stressBoundaryDetected,
    firstCriticalConfig: detection.firstCriticalConfig,
    firstStressConfig: detection.firstStressConfig,
  });
}
