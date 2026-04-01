/**
 * S-5B — Scan exploration results for first STRESS/CRITICAL. Deterministic order.
 */

import type { ParameterConfig, ParameterResult } from '../../exploration/core/ExplorationTypes.js';

export interface FrontierDetection {
  readonly frontierDetected: boolean;
  readonly stressBoundaryDetected: boolean;
  readonly firstCriticalConfig: ParameterConfig | null;
  readonly firstStressConfig: ParameterConfig | null;
}

/**
 * Deterministic order: sort by (nodeCount, intensity, duration), then scan.
 */
function configOrder(a: ParameterConfig, b: ParameterConfig): number {
  if (a.nodeCount !== b.nodeCount) return a.nodeCount - b.nodeCount;
  if (a.intensity !== b.intensity) return a.intensity - b.intensity;
  return a.duration - b.duration;
}

export function detectFrontier(results: readonly ParameterResult[]): FrontierDetection {
  const sorted = [...results].sort((x, y) => configOrder(x.config, y.config));
  let firstCritical: ParameterConfig | null = null;
  let firstStress: ParameterConfig | null = null;
  for (const r of sorted) {
    if (r.riskEnvelope === 'CRITICAL' && firstCritical === null) {
      firstCritical = r.config;
    }
    if ((r.riskEnvelope === 'STRESS' || r.riskEnvelope === 'CRITICAL') && firstStress === null) {
      firstStress = r.config;
    }
  }
  return Object.freeze({
    frontierDetected: firstCritical !== null,
    stressBoundaryDetected: firstStress !== null,
    firstCriticalConfig: firstCritical,
    firstStressConfig: firstStress,
  });
}
