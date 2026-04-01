/**
 * Phase 13M — Scalable Trust Graph Engine.
 */

export type { GraphNode, TrustEdge, ScalableTrustGraph } from './scalable_graph_types.js';
export type { NodeIndex, EdgeIndex, ReverseEdgeIndex } from './graph_storage_index.js';
export { buildReverseIndex } from './graph_storage_index.js';
export { ScalableTrustGraphEngine, DEFAULT_MAX_GRAPH_NODES } from './scalable_trust_graph.js';
export { buildScalableTrustGraph } from './trust_graph_builder.js';
export { getNeighbors, getInboundNeighbors, computeTrustPropagation, computeTrustPropagationFromEngine } from './trust_graph_query.js';
export type { TrustWeightCalculator } from './trust_weight_calculator.js';
export { DefaultTrustWeightCalculator } from './trust_weight_calculator.js';
export type { TrustPropagationResult, PropagationCacheKey } from './trust_propagation_types.js';
export { propagationCacheKeyString } from './trust_propagation_types.js';
export { TrustPropagationCache, MAX_PROPAGATION_CACHE } from './trust_propagation_cache.js';
export { TrustPropagationEngine } from './trust_propagation_engine.js';
export type { TrustPropagationEngineOptions } from './trust_propagation_engine.js';

export type { TrustDecayPolicy } from './trust_decay_types.js';
export { DEFAULT_TRUST_DECAY_POLICY, DEFAULT_NODE_TYPE_DECAY } from './trust_decay_types.js';
export { TrustDecayPolicyProvider } from './trust_decay_policy.js';
export type { TrustGraphPolicyWithDecay } from './trust_decay_policy.js';
export { TrustDecayCalculator } from './trust_decay_calculator.js';
export type { TrustDecayCalculatorOptions } from './trust_decay_calculator.js';
