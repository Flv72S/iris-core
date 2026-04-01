/**
 * S-5B — Deterministic boundary refinement: midpoint configs between last SAFE and first bad.
 */

import type { ParameterConfig } from '../../exploration/core/ExplorationTypes.js';

/**
 * Midpoint for numeric axis (integer for node/duration, float for intensity).
 */
function midpoint(a: number, b: number, isInt: boolean): number {
  const m = (a + b) / 2;
  return isInt ? Math.floor(m) : Math.round(m * 1e9) / 1e9;
}

/**
 * Produce one layer of refinement configs: one midpoint per axis between lastSafe and firstBad.
 * Caller runs these, then can call again with updated lastSafe/firstBad for refinementIterations cycles.
 */
export function produceRefinementConfigs(
  lastSafe: ParameterConfig,
  firstBad: ParameterConfig,
): ParameterConfig[] {
  const out: ParameterConfig[] = [];
  if (lastSafe.nodeCount !== firstBad.nodeCount) {
    const mid = midpoint(lastSafe.nodeCount, firstBad.nodeCount, true);
    out.push(Object.freeze({ nodeCount: mid, intensity: lastSafe.intensity, duration: lastSafe.duration }));
  }
  if (lastSafe.intensity !== firstBad.intensity) {
    const mid = midpoint(lastSafe.intensity, firstBad.intensity, false);
    out.push(Object.freeze({ nodeCount: lastSafe.nodeCount, intensity: mid, duration: lastSafe.duration }));
  }
  if (lastSafe.duration !== firstBad.duration) {
    const mid = midpoint(lastSafe.duration, firstBad.duration, true);
    out.push(Object.freeze({ nodeCount: lastSafe.nodeCount, intensity: lastSafe.intensity, duration: mid }));
  }
  return deterministicSort(out);
}

function deterministicSort(configs: ParameterConfig[]): ParameterConfig[] {
  return [...configs].sort((a, b) => {
    if (a.nodeCount !== b.nodeCount) return a.nodeCount - b.nodeCount;
    if (a.intensity !== b.intensity) return a.intensity - b.intensity;
    return a.duration - b.duration;
  });
}
