/**
 * S-5 — Fragility boundaries: max stable nodeCount, intensity, duration; critical boundary.
 */

import type { ParameterResult } from '../core/ExplorationTypes.js';

export interface FragilityBoundaries {
  readonly safeCount: number;
  readonly stressCount: number;
  readonly criticalCount: number;
  readonly maxStableNodeCount: number;
  readonly maxStableIntensity: number;
  readonly maxStableDuration: number;
  readonly criticalBoundaryDetected: boolean;
}

function isStableSafe(r: ParameterResult): boolean {
  return r.safetyFailureRate === 0 && r.livenessFailureRate === 0 && r.stabilityIndex >= 0.95;
}

export function computeFragilityBoundaries(results: readonly ParameterResult[]): FragilityBoundaries {
  let safeCount = 0;
  let stressCount = 0;
  let criticalCount = 0;
  let maxStableNodeCount = 0;
  let maxStableIntensity = 0;
  let maxStableDuration = 0;

  for (const r of results) {
    if (r.safetyFailureRate > 0 || r.livenessFailureRate > 0) {
      criticalCount += 1;
    } else if (r.stabilityIndex < 0.95) {
      stressCount += 1;
    } else {
      safeCount += 1;
      if (isStableSafe(r)) {
        maxStableNodeCount = Math.max(maxStableNodeCount, r.config.nodeCount);
        maxStableIntensity = Math.max(maxStableIntensity, r.config.intensity);
        maxStableDuration = Math.max(maxStableDuration, r.config.duration);
      }
    }
  }

  return Object.freeze({
    safeCount,
    stressCount,
    criticalCount,
    maxStableNodeCount,
    maxStableIntensity,
    maxStableDuration,
    criticalBoundaryDetected: criticalCount > 0,
  });
}
