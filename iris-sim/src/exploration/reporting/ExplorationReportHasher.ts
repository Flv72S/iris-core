/**
 * S-5 — Deterministic exploration report hash.
 */

import { createHash } from 'crypto';
import type { ParameterResult } from '../core/ExplorationTypes.js';
import type { FragilityBoundaries } from '../mapping/FragilityAnalyzer.js';
import { parameterConfigKey } from '../core/ParameterConfig.js';

function canonicalResult(r: ParameterResult): string {
  return [
    parameterConfigKey(r.config),
    String(r.stabilityIndex),
    String(r.safetyFailureRate),
    String(r.livenessFailureRate),
    r.riskEnvelope,
    String(r.maxSoftEvents),
    String(r.maxLivenessDelay),
    r.riskReportHash,
  ].join('|');
}

export function computeExplorationHash(
  results: readonly ParameterResult[],
  boundaries: FragilityBoundaries,
): string {
  const sorted = [...results].sort((a, b) => {
    const ka = parameterConfigKey(a.config);
    const kb = parameterConfigKey(b.config);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const resultsPayload = sorted.map(canonicalResult).join('\n');
  const boundsPayload = [
    String(boundaries.safeCount),
    String(boundaries.stressCount),
    String(boundaries.criticalCount),
    String(boundaries.maxStableNodeCount),
    String(boundaries.maxStableIntensity),
    String(boundaries.maxStableDuration),
    boundaries.criticalBoundaryDetected ? '1' : '0',
  ].join('|');
  const payload = resultsPayload + '\n---\n' + boundsPayload;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
