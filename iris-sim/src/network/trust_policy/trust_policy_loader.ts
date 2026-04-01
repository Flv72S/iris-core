/**
 * Phase 13L — Trust Policy Configuration System. Load policy from configuration.
 */

import type { TrustPolicyConfig } from './trust_policy_types.js';
import { validateTrustPolicy } from './trust_policy_validator.js';

function hasOwn(obj: unknown, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}

function requireNumber(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`Trust policy load failed: ${key} must be a finite number, got ${typeof v}`);
  }
  return v;
}

function requireString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== 'string') {
    throw new Error(`Trust policy load failed: ${key} must be a string, got ${typeof v}`);
  }
  return v;
}

function loadSubPolicy(
  obj: Record<string, unknown>,
  keys: readonly { key: string; type: 'number' }[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { key } of keys) {
    out[key] = requireNumber(obj, key);
  }
  return out;
}

/**
 * Load and validate a trust policy from a JSON-like object.
 * Step 1: validate structure (required keys and types)
 * Step 2: run validator (ranges and limits)
 * Step 3: return policy object
 * @throws if structure is invalid or validation fails
 */
export function loadTrustPolicy(policy_json: unknown): TrustPolicyConfig {
  if (!isObject(policy_json)) {
    throw new Error('Trust policy load failed: policy_json must be an object');
  }

  const version = requireString(policy_json, 'version');
  const timestamp = requireNumber(policy_json, 'timestamp');

  const requiredSections = [
    'anomaly_detection',
    'reputation',
    'trust_graph',
    'governance',
    'recovery',
  ] as const;
  for (const section of requiredSections) {
    if (!hasOwn(policy_json, section) || !isObject(policy_json[section])) {
      throw new Error(`Trust policy load failed: missing or invalid section "${section}"`);
    }
  }

  const anomaly_detection = loadSubPolicy(policy_json.anomaly_detection as Record<string, unknown>, [
    { key: 'anomaly_score_threshold', type: 'number' },
    { key: 'cluster_detection_threshold', type: 'number' },
    { key: 'anomaly_window_size', type: 'number' },
  ]);
  const reputation = loadSubPolicy(policy_json.reputation as Record<string, unknown>, [
    { key: 'minimum_reputation', type: 'number' },
    { key: 'critical_reputation_threshold', type: 'number' },
    { key: 'reputation_decay_rate', type: 'number' },
  ]);
  const trust_graph = loadSubPolicy(policy_json.trust_graph as Record<string, unknown>, [
    { key: 'max_edges_per_node', type: 'number' },
    { key: 'max_graph_nodes', type: 'number' },
    { key: 'trust_propagation_depth', type: 'number' },
    { key: 'trust_decay_factor', type: 'number' },
  ]);
  const governance = loadSubPolicy(policy_json.governance as Record<string, unknown>, [
    { key: 'governance_trigger_threshold', type: 'number' },
    { key: 'max_operations_per_cycle', type: 'number' },
    { key: 'quarantine_threshold', type: 'number' },
  ]);
  const recovery = loadSubPolicy(policy_json.recovery as Record<string, unknown>, [
    { key: 'recovery_cooldown_blocks', type: 'number' },
    { key: 'recovery_success_threshold', type: 'number' },
  ]);

  const policy: TrustPolicyConfig = Object.freeze({
    version,
    timestamp,
    anomaly_detection: Object.freeze(anomaly_detection) as unknown as TrustPolicyConfig['anomaly_detection'],
    reputation: Object.freeze(reputation) as unknown as TrustPolicyConfig['reputation'],
    trust_graph: Object.freeze(trust_graph) as unknown as TrustPolicyConfig['trust_graph'],
    governance: Object.freeze(governance) as unknown as TrustPolicyConfig['governance'],
    recovery: Object.freeze(recovery) as unknown as TrustPolicyConfig['recovery'],
  });

  validateTrustPolicy(policy);
  return policy;
}
