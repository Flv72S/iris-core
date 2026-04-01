/**
 * S-5B — Given results and detection, produce list of configs to run for refinement (deduped).
 */

import type { ParameterConfig, ParameterResult } from '../../exploration/core/ExplorationTypes.js';
import { parameterConfigKey } from '../../exploration/core/ParameterConfig.js';
import type { FrontierDetection } from './FrontierDetector.js';
import { produceRefinementConfigs } from '../core/RefinementStrategy.js';

function configOrder(a: ParameterConfig, b: ParameterConfig): number {
  if (a.nodeCount !== b.nodeCount) return a.nodeCount - b.nodeCount;
  if (a.intensity !== b.intensity) return a.intensity - b.intensity;
  return a.duration - b.duration;
}

/**
 * Find last SAFE config in sorted order (before first stress/critical).
 */
function findLastSafeConfig(results: readonly ParameterResult[], firstBad: ParameterConfig | null): ParameterConfig | null {
  if (!firstBad) return null;
  const sorted = [...results].sort((a, b) => configOrder(a.config, b.config));
  let lastSafe: ParameterConfig | null = null;
  for (const r of sorted) {
    if (r.riskEnvelope === 'SAFE') lastSafe = r.config;
    if (r.config === firstBad) break;
  }
  return lastSafe;
}

/**
 * Return new refinement configs that are not already in exploredKeys.
 */
export function getRefinementConfigsToRun(
  results: readonly ParameterResult[],
  detection: FrontierDetection,
  exploredKeys: ReadonlySet<string>,
): ParameterConfig[] {
  const firstBad = detection.firstCriticalConfig ?? detection.firstStressConfig;
  if (!firstBad) return [];
  const lastSafe = findLastSafeConfig(results, firstBad);
  if (!lastSafe) return [];
  const candidates = produceRefinementConfigs(lastSafe, firstBad);
  return candidates.filter((c) => !exploredKeys.has(parameterConfigKey(c)));
}
