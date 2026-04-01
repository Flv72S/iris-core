/**
 * Phase 11F — Risk Trend Analysis. Drift severity scoring.
 * Deterministic: maximum severity when multiple signals exist for the node.
 */

import type { SLADriftSignal } from '../../cross_tenant_sla/drift/sla_drift_types.js';

/** Drift signal with optional node attribution for per-node filtering. */
export type DriftSignalWithNode = SLADriftSignal & { readonly node_id?: string };

const SEVERITY_HIGH = 1.0;
const SEVERITY_MEDIUM = 0.6;
const SEVERITY_LOW = 0.3;
const SEVERITY_NONE = 0;

function severityToScore(severity: string): number {
  const s = severity.toUpperCase();
  if (s === 'HIGH') return SEVERITY_HIGH;
  if (s === 'MEDIUM') return SEVERITY_MEDIUM;
  if (s === 'LOW') return SEVERITY_LOW;
  return SEVERITY_NONE;
}

/**
 * Compute drift severity score for a node. Uses maximum severity when multiple signals exist.
 * If signals have node_id, only those matching nodeId are considered; otherwise all signals apply.
 */
export function computeDriftSeverityScore(
  nodeId: string,
  driftSignals: readonly DriftSignalWithNode[]
): number {
  const filtered =
    driftSignals.length > 0 && (driftSignals[0] as DriftSignalWithNode).node_id !== undefined
      ? driftSignals.filter((s) => (s as DriftSignalWithNode).node_id === nodeId)
      : [...driftSignals];
  if (filtered.length === 0) return SEVERITY_NONE;
  let max = SEVERITY_NONE;
  for (const s of filtered) {
    const score = severityToScore(String(s.drift_severity));
    if (score > max) max = score;
  }
  return max;
}
