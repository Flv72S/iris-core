/**
 * Phase 13B — Trust Graph Engine. Main orchestrator.
 */

import type { NodeReputationProfile } from '../reputation_engine/index.js';
import type { TrustGraph } from './trust_graph_types.js';
import { buildTrustGraph } from './trust_graph_builder.js';
import { propagateTrust } from './trust_propagation_engine.js';
import { applyTrustDecay } from './trust_decay_engine.js';

const DEFAULT_PROPAGATION_FACTOR = 0.5;
const DEFAULT_DECAY_FACTOR = 0.95;

/**
 * Build base graph, propagate trust, apply decay. Deterministic.
 */
export function computeTrustGraph(reputations: readonly NodeReputationProfile[]): TrustGraph {
  let graph = buildTrustGraph(reputations);
  graph = propagateTrust(graph, DEFAULT_PROPAGATION_FACTOR);
  graph = applyTrustDecay(graph, DEFAULT_DECAY_FACTOR);
  return graph;
}
