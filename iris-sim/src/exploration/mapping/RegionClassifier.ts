/**
 * S-5 — Classify each config as SAFE / STRESS / CRITICAL. Deterministic.
 */

import type { ParameterResult, RegionClassification } from '../core/ExplorationTypes.js';

export function classifyRegion(result: ParameterResult): RegionClassification {
  if (result.safetyFailureRate > 0 || result.livenessFailureRate > 0) return 'CRITICAL';
  if (result.stabilityIndex < 0.95) return 'STRESS';
  return 'SAFE';
}
