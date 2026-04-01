/**
 * Phase 13L — Trust Policy Configuration System. Default policy.
 */

import type { TrustPolicyConfig } from './trust_policy_types.js';

export const DEFAULT_TRUST_POLICY: TrustPolicyConfig = Object.freeze({
  version: '1.0',
  timestamp: 0,

  anomaly_detection: Object.freeze({
    anomaly_score_threshold: 0.8,
    cluster_detection_threshold: 3,
    anomaly_window_size: 100,
  }),

  reputation: Object.freeze({
    minimum_reputation: 0.1,
    critical_reputation_threshold: 0.2,
    reputation_decay_rate: 0.01,
  }),

  trust_graph: Object.freeze({
    max_edges_per_node: 50,
    max_graph_nodes: 100_000,
    trust_propagation_depth: 3,
    trust_decay_factor: 0.9,
  }),

  governance: Object.freeze({
    governance_trigger_threshold: 0.75,
    max_operations_per_cycle: 50,
    quarantine_threshold: 0.15,
  }),

  recovery: Object.freeze({
    recovery_cooldown_blocks: 10,
    recovery_success_threshold: 0.6,
  }),
});
