/**
 * Phase 13N — Optimized Trust Propagation. Cached propagation engine.
 * Phase 13XX-B: optional adaptive decay by node type via TrustDecayCalculator and NodeIdentityRegistry.
 */

import type { ScalableTrustGraphEngine } from './scalable_trust_graph.js';
import type { TrustPropagationResult, PropagationCacheKey } from './trust_propagation_types.js';
import type { TrustPropagationCache } from './trust_propagation_cache.js';
import type { TrustDecayCalculator } from './trust_decay_calculator.js';
import type { NodeIdentityRegistry } from '../node_identity/index.js';

/**
 * Bounded BFS propagation: propagated_score = edge_weight × decay_factor^depth.
 * When decayCalculator (and optionally nodeRegistry) are provided, decay_factor is per target node type.
 * Multiple paths to same node: store maximum score. Deterministic traversal via graph.getNeighbors() order.
 */
export interface TrustPropagationEngineOptions {
  readonly decayCalculator?: TrustDecayCalculator | undefined;
  readonly nodeRegistry?: NodeIdentityRegistry | undefined;
}

export class TrustPropagationEngine {
  private readonly decayCalculator: TrustDecayCalculator | undefined;
  private readonly nodeRegistry: NodeIdentityRegistry | undefined;

  constructor(
    private readonly graph: ScalableTrustGraphEngine,
    private readonly cache: TrustPropagationCache,
    options: TrustPropagationEngineOptions = {}
  ) {
    this.decayCalculator = options.decayCalculator;
    this.nodeRegistry = options.nodeRegistry;
  }

  /** Resolve decay factor for a target node: adaptive when calculator+registry present, else policy default. */
  private getDecayForTarget(target_node_id: string): number {
    const policy = this.graph.getPolicy();
    if (this.decayCalculator != null) {
      if (this.nodeRegistry != null) {
        const reg = this.nodeRegistry.getRegistration(target_node_id);
        const node_type = reg?.identity?.node_type;
        if (node_type != null) return this.decayCalculator.computeDecayFactor(node_type);
      }
      return this.decayCalculator.getDefaultDecayFactor();
    }
    return policy.trust_decay_factor;
  }

  propagateTrust(source_node: string): TrustPropagationResult {
    const graphVersion = this.graph.getGraphVersion();
    const cacheKey: PropagationCacheKey = { source_node, graph_version: graphVersion };
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const policy = this.graph.getPolicy();
    const maxDepth = policy.trust_propagation_depth;

    const propagated_scores = new Map<string, number>();
    propagated_scores.set(source_node, 1);

    const useAdaptiveDecay = this.decayCalculator != null;
    let frontier = new Map<string, number>([[source_node, 1]]);
    for (let d = 0; d < maxDepth && frontier.size > 0; d++) {
      const next = new Map<string, number>();
      const depthExponent = useAdaptiveDecay ? d + 1 : d;
      for (const [node, _scoreAtNode] of frontier) {
        const edges = this.graph.getNeighbors(node);
        for (const e of edges) {
          const decay = this.getDecayForTarget(e.target);
          const propagated = e.weight * Math.pow(decay, depthExponent);
          const cur = next.get(e.target) ?? 0;
          if (propagated > cur) next.set(e.target, propagated);
          const existing = propagated_scores.get(e.target) ?? 0;
          if (propagated > existing) propagated_scores.set(e.target, propagated);
        }
      }
      frontier = next;
    }

    const result: TrustPropagationResult = Object.freeze({
      source_node,
      propagated_scores: new Map(propagated_scores),
    });
    this.cache.set(cacheKey, result);
    return result;
  }
}
