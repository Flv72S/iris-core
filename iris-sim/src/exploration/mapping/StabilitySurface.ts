/**
 * S-5 — Stability surface: (nodeCount, intensity, duration) → StabilityIndex, Envelope.
 */

import type { ParameterResult } from '../core/ExplorationTypes.js';
import { parameterConfigKey } from '../core/ParameterConfig.js';

export interface SurfacePoint {
  readonly stabilityIndex: number;
  readonly envelope: 'SAFE' | 'STRESS' | 'CRITICAL';
}

export function buildStabilitySurface(results: readonly ParameterResult[]): Map<string, SurfacePoint> {
  const map = new Map<string, SurfacePoint>();
  for (const r of results) {
    map.set(parameterConfigKey(r.config), Object.freeze({ stabilityIndex: r.stabilityIndex, envelope: r.riskEnvelope }));
  }
  return map;
}

export function getSurfaceEntriesSorted(surface: Map<string, SurfacePoint>): [string, SurfacePoint][] {
  return [...surface.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}
