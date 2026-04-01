/**
 * S-5B — Deterministic expansion: one axis per cycle. No duplicates, sorted order.
 */

import type { ParameterConfig } from '../../exploration/core/ExplorationTypes.js';

export type ExpansionAxis = 'node' | 'intensity' | 'duration';

function sortedUnique(arr: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const v of arr.slice().sort((a, b) => a - b)) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Expand one axis. Order: 1) nodeCount, 2) intensity, 3) duration. Returns new arrays and which axis was expanded.
 */
export function expandOneAxis(
  nodeCounts: number[],
  intensities: number[],
  durations: number[],
  stepNode: number,
  stepIntensity: number,
  stepDuration: number,
  maxNode: number,
  maxIntensity: number,
  maxDuration: number,
  cycleIndex: number,
): { nodeCounts: number[]; intensities: number[]; durations: number[]; axis: ExpansionAxis | null } {
  const axisOrder: ExpansionAxis[] = ['node', 'intensity', 'duration'];
  const axis = axisOrder[cycleIndex % 3];

  if (axis === 'node') {
    const currentMax = Math.max(...nodeCounts);
    if (currentMax >= maxNode) return { nodeCounts, intensities, durations, axis: null };
    const next = Math.min(currentMax + stepNode, maxNode);
    return { nodeCounts: sortedUnique([...nodeCounts, next]), intensities, durations, axis: 'node' };
  }
  if (axis === 'intensity') {
    const currentMax = Math.max(...intensities);
    if (currentMax >= maxIntensity) return { nodeCounts, intensities, durations, axis: null };
    const next = Math.min(currentMax + stepIntensity, maxIntensity);
    return { nodeCounts, intensities: sortedUnique([...intensities, next]), durations, axis: 'intensity' };
  }
  const currentMax = Math.max(...durations);
  if (currentMax >= maxDuration) return { nodeCounts, intensities, durations, axis: null };
  const next = Math.min(currentMax + stepDuration, maxDuration);
  return { nodeCounts, intensities, durations: sortedUnique([...durations, next]), axis: 'duration' };
}

/**
 * Build full grid from the three arrays (same logic as S-5 ParameterGrid).
 */
export function buildGridFromBounds(
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
