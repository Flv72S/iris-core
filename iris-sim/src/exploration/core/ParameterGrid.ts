/**
 * S-5 — Deterministic parameter grid. No randomness.
 */

import type { ParameterConfig } from './ExplorationTypes.js';

/**
 * Generate all combinations of nodeCounts × intensities × durations in deterministic order.
 */
export function buildParameterGrid(
  nodeCounts: number[],
  intensities: number[],
  durations: number[],
): ParameterConfig[] {
  const out: ParameterConfig[] = [];
  for (const nodeCount of nodeCounts) {
    for (const intensity of intensities) {
      for (const duration of durations) {
        out.push(Object.freeze({ nodeCount, intensity, duration }));
      }
    }
  }
  return out;
}
