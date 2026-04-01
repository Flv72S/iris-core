/**
 * Phase 13L — Trust Policy Configuration System. Strict validation.
 */

import type { TrustPolicyConfig } from './trust_policy_types.js';

const MIN_SAFE = 0;
const MAX_ONE = 1;
const MAX_EDGES_PER_NODE_LIMIT = 200;
const MAX_PROPAGATION_DEPTH = 10;
const MAX_GRAPH_NODES_LIMIT = 1_000_000;

function inRange(value: number, min: number, max: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(
      `Trust policy validation failed: ${name} must be a finite number in [${min}, ${max}], got ${value}`
    );
  }
}

function inRangeInt(value: number, min: number, max: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || Math.floor(value) !== value) {
    throw new Error(
      `Trust policy validation failed: ${name} must be an integer in [${min}, ${max}], got ${value}`
    );
  }
}

/**
 * Validate a trust policy. Throws a descriptive Error if validation fails.
 * @returns true if valid (never returns false; throws instead).
 */
export function validateTrustPolicy(policy: TrustPolicyConfig): boolean {
  if (policy == null || typeof policy !== 'object') {
    throw new Error('Trust policy validation failed: policy must be a non-null object');
  }

  if (typeof policy.version !== 'string' || policy.version.length === 0) {
    throw new Error('Trust policy validation failed: version must be a non-empty string');
  }
  if (typeof policy.timestamp !== 'number' || !Number.isFinite(policy.timestamp) || policy.timestamp < 0) {
    throw new Error('Trust policy validation failed: timestamp must be a non-negative finite number');
  }

  const ad = policy.anomaly_detection;
  if (ad == null || typeof ad !== 'object') {
    throw new Error('Trust policy validation failed: anomaly_detection must be an object');
  }
  inRange(ad.anomaly_score_threshold, MIN_SAFE, MAX_ONE, 'anomaly_detection.anomaly_score_threshold');
  inRangeInt(ad.cluster_detection_threshold, 1, 1000, 'anomaly_detection.cluster_detection_threshold');
  inRangeInt(ad.anomaly_window_size, 1, 100_000, 'anomaly_detection.anomaly_window_size');

  const rep = policy.reputation;
  if (rep == null || typeof rep !== 'object') {
    throw new Error('Trust policy validation failed: reputation must be an object');
  }
  inRange(rep.minimum_reputation, MIN_SAFE, MAX_ONE, 'reputation.minimum_reputation');
  inRange(rep.critical_reputation_threshold, MIN_SAFE, MAX_ONE, 'reputation.critical_reputation_threshold');
  inRange(rep.reputation_decay_rate, MIN_SAFE, MAX_ONE, 'reputation.reputation_decay_rate');

  const tg = policy.trust_graph;
  if (tg == null || typeof tg !== 'object') {
    throw new Error('Trust policy validation failed: trust_graph must be an object');
  }
  inRangeInt(tg.max_edges_per_node, 1, MAX_EDGES_PER_NODE_LIMIT, 'trust_graph.max_edges_per_node');
  inRangeInt(tg.max_graph_nodes, 1, MAX_GRAPH_NODES_LIMIT, 'trust_graph.max_graph_nodes');
  inRangeInt(tg.trust_propagation_depth, 0, MAX_PROPAGATION_DEPTH, 'trust_graph.trust_propagation_depth');
  inRange(tg.trust_decay_factor, MIN_SAFE, MAX_ONE, 'trust_graph.trust_decay_factor');

  const gov = policy.governance;
  if (gov == null || typeof gov !== 'object') {
    throw new Error('Trust policy validation failed: governance must be an object');
  }
  inRange(gov.governance_trigger_threshold, MIN_SAFE, MAX_ONE, 'governance.governance_trigger_threshold');
  inRangeInt(gov.max_operations_per_cycle, 1, 500, 'governance.max_operations_per_cycle');
  inRange(gov.quarantine_threshold, MIN_SAFE, MAX_ONE, 'governance.quarantine_threshold');

  const rec = policy.recovery;
  if (rec == null || typeof rec !== 'object') {
    throw new Error('Trust policy validation failed: recovery must be an object');
  }
  inRangeInt(rec.recovery_cooldown_blocks, 0, 100_000, 'recovery.recovery_cooldown_blocks');
  inRange(rec.recovery_success_threshold, MIN_SAFE, MAX_ONE, 'recovery.recovery_success_threshold');

  return true;
}
