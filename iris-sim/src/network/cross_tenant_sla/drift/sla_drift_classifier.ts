/**
 * Phase 11C.1 — SLA Drift severity classification.
 * Configurable thresholds; deterministic.
 */

import type { SLADriftSeverity } from './sla_drift_types.js';

/** |slope| < LOW_THRESHOLD → LOW */
export const DRIFT_SEVERITY_LOW_THRESHOLD = 0.001;
/** |slope| < MEDIUM_THRESHOLD → MEDIUM (else HIGH) */
export const DRIFT_SEVERITY_MEDIUM_THRESHOLD = 0.01;

export function classifyDriftSeverity(slope: number): SLADriftSeverity {
  const abs = Math.abs(slope);
  if (abs < DRIFT_SEVERITY_LOW_THRESHOLD) return 'LOW';
  if (abs < DRIFT_SEVERITY_MEDIUM_THRESHOLD) return 'MEDIUM';
  return 'HIGH';
}
