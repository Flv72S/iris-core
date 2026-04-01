/**
 * Phase 13N — Optimized Trust Propagation. Types.
 */

export interface TrustPropagationResult {
  readonly source_node: string;
  readonly propagated_scores: ReadonlyMap<string, number>;
}

export interface PropagationCacheKey {
  readonly source_node: string;
  readonly graph_version: number;
}

export function propagationCacheKeyString(key: PropagationCacheKey): string {
  return `${key.source_node}:${key.graph_version}`;
}
