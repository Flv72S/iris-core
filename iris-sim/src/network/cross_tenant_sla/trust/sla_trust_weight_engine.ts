/**
 * Phase 11C.2 — Trust weight engine.
 * Clamp scores to [0,1]; normalize so weights per service sum to 1 (or equal if sum 0).
 */

import type { NodeTrustScore } from './sla_trust_types.js';

/**
 * Clamp each trust_score to [0, 1]. Returns new array, deterministic order (by node_id).
 */
export function normalizeTrustScores(scores: readonly NodeTrustScore[]): NodeTrustScore[] {
  const sorted = [...scores].sort((a, b) => a.node_id.localeCompare(b.node_id));
  return sorted.map((s) =>
    Object.freeze({
      ...s,
      trust_score: Math.max(0, Math.min(1, s.trust_score)),
    })
  );
}

/**
 * Build map node_id -> trust_score (clamped). Deterministic iteration order.
 */
export function buildNodeTrustMap(scores: readonly NodeTrustScore[]): Map<string, number> {
  const normalized = normalizeTrustScores(scores);
  const m = new Map<string, number>();
  for (const s of normalized) m.set(s.node_id, s.trust_score);
  return m;
}

/**
 * For a set of node_ids and a trust map, return normalized weights (sum = 1).
 * If sum of scores is 0 → equal weights 1/n.
 */
export function weightsForNodes(
  nodeIds: readonly string[],
  trustMap: Map<string, number>
): Map<string, number> {
  const sorted = [...nodeIds].sort();
  const rawWeights = sorted.map((id) => trustMap.get(id) ?? 0);
  const sum = rawWeights.reduce((a, b) => a + b, 0);
  const out = new Map<string, number>();
  if (sum <= 0) {
    const w = 1 / sorted.length;
    sorted.forEach((id) => out.set(id, w));
  } else {
    sorted.forEach((id, i) => out.set(id, rawWeights[i]! / sum));
  }
  return out;
}
