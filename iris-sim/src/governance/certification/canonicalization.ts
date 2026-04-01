/**
 * Step 7B — Canonical JSON serialization for deterministic hashing.
 */

import type { CertificationPayload } from './certificationPayload.js';

/**
 * Canonical serialization: keys sorted alphabetically, no undefined.
 * Deterministic and replay-safe.
 */
export function canonicalizePayload(payload: CertificationPayload): string {
  const obj: Record<string, unknown> = {
    computedAt: payload.computedAt,
    modelVersion: payload.modelVersion,
    normalizedMetrics: sortRecord(payload.normalizedMetrics),
    score: payload.score,
    tier: payload.tier,
  };
  return JSON.stringify(obj);
}

function sortRecord(r: Record<string, number>): Record<string, number> {
  const keys = Object.keys(r).sort();
  const out: Record<string, number> = {};
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}
