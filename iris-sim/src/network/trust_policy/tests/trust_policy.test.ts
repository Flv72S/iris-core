/**
 * Phase 13L — Trust Policy Configuration System. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  DEFAULT_TRUST_POLICY,
  TrustPolicyRegistry,
  validateTrustPolicy,
  loadTrustPolicy,
} from '../index.js';
import type { TrustPolicyConfig } from '../trust_policy_types.js';
import { runTrustPipeline } from '../../trust_pipeline/index.js';
import { runGovernanceAutomation } from '../../governance_automation/index.js';

describe('Trust Policy (13L)', () => {
  it('Policy validation success: default policy passes', () => {
    assert.strictEqual(validateTrustPolicy(DEFAULT_TRUST_POLICY), true);
  });

  it('Policy validation failure: invalid anomaly_score_threshold throws', () => {
    const bad = {
      ...DEFAULT_TRUST_POLICY,
      anomaly_detection: {
        ...DEFAULT_TRUST_POLICY.anomaly_detection,
        anomaly_score_threshold: 1.5,
      },
    } as TrustPolicyConfig;
    assert.throws(
      () => validateTrustPolicy(bad),
      /anomaly_score_threshold must be a finite number in \[0, 1\]/
    );
  });

  it('Policy validation failure: max_edges_per_node > 200 throws', () => {
    const bad = {
      ...DEFAULT_TRUST_POLICY,
      trust_graph: {
        ...DEFAULT_TRUST_POLICY.trust_graph,
        max_edges_per_node: 250,
        max_graph_nodes: 100_000,
      },
    } as TrustPolicyConfig;
    assert.throws(
      () => validateTrustPolicy(bad),
      /max_edges_per_node must be an integer in \[1, 200\]/
    );
  });

  it('Policy validation failure: trust_propagation_depth > 10 throws', () => {
    const bad = {
      ...DEFAULT_TRUST_POLICY,
      trust_graph: {
        ...DEFAULT_TRUST_POLICY.trust_graph,
        max_graph_nodes: 100_000,
        trust_propagation_depth: 11,
      },
    } as TrustPolicyConfig;
    assert.throws(
      () => validateTrustPolicy(bad),
      /trust_propagation_depth must be an integer in \[0, 10\]/
    );
  });

  it('Policy validation failure: null policy throws', () => {
    assert.throws(
      () => validateTrustPolicy(null as unknown as TrustPolicyConfig),
      /policy must be a non-null object/
    );
  });

  it('Policy registry update: getPolicy returns default, then updated policy', () => {
    const registry = new TrustPolicyRegistry();
    const initial = registry.getPolicy();
    assert.strictEqual(initial.version, '1.0');
    assert.strictEqual(initial.governance.max_operations_per_cycle, 50);

    const custom: TrustPolicyConfig = {
      ...DEFAULT_TRUST_POLICY,
      version: '1.1',
      timestamp: 1000,
      governance: {
        ...DEFAULT_TRUST_POLICY.governance,
        max_operations_per_cycle: 25,
      },
    };
    registry.updatePolicy(custom);
    const updated = registry.getPolicy();
    assert.strictEqual(updated.version, '1.1');
    assert.strictEqual(updated.governance.max_operations_per_cycle, 25);
  });

  it('Policy registry update: invalid policy throws and does not update', () => {
    const registry = new TrustPolicyRegistry();
    const before = registry.getPolicy();

    const invalid = {
      ...DEFAULT_TRUST_POLICY,
      governance: {
        ...DEFAULT_TRUST_POLICY.governance,
        max_operations_per_cycle: -1,
      },
    } as TrustPolicyConfig;

    assert.throws(() => registry.updatePolicy(invalid), /validation failed/);
    assert.strictEqual(registry.getPolicy(), before);
  });

  it('Default policy load: DEFAULT_TRUST_POLICY has expected structure', () => {
    assert.strictEqual(DEFAULT_TRUST_POLICY.version, '1.0');
    assert.strictEqual(DEFAULT_TRUST_POLICY.timestamp, 0);
    assert.strictEqual(DEFAULT_TRUST_POLICY.anomaly_detection.anomaly_score_threshold, 0.8);
    assert.strictEqual(DEFAULT_TRUST_POLICY.anomaly_detection.cluster_detection_threshold, 3);
    assert.strictEqual(DEFAULT_TRUST_POLICY.reputation.critical_reputation_threshold, 0.2);
    assert.strictEqual(DEFAULT_TRUST_POLICY.trust_graph.max_edges_per_node, 50);
    assert.strictEqual(DEFAULT_TRUST_POLICY.trust_graph.max_graph_nodes, 100_000);
    assert.strictEqual(DEFAULT_TRUST_POLICY.trust_graph.trust_propagation_depth, 3);
    assert.strictEqual(DEFAULT_TRUST_POLICY.governance.max_operations_per_cycle, 50);
    assert.strictEqual(DEFAULT_TRUST_POLICY.recovery.recovery_cooldown_blocks, 10);
  });

  it('Policy boundary limits: min valid values pass', () => {
    const atMin: TrustPolicyConfig = {
      version: '1.0',
      timestamp: 0,
      anomaly_detection: { anomaly_score_threshold: 0, cluster_detection_threshold: 1, anomaly_window_size: 1 },
      reputation: { minimum_reputation: 0, critical_reputation_threshold: 0, reputation_decay_rate: 0 },
      trust_graph: { max_edges_per_node: 1, max_graph_nodes: 1000, trust_propagation_depth: 0, trust_decay_factor: 0 },
      governance: { governance_trigger_threshold: 0, max_operations_per_cycle: 1, quarantine_threshold: 0 },
      recovery: { recovery_cooldown_blocks: 0, recovery_success_threshold: 0 },
    };
    assert.strictEqual(validateTrustPolicy(atMin), true);
  });

  it('Policy boundary limits: max valid values pass', () => {
    const atMax: TrustPolicyConfig = {
      version: '1.0',
      timestamp: 0,
      anomaly_detection: { anomaly_score_threshold: 1, cluster_detection_threshold: 1000, anomaly_window_size: 100_000 },
      reputation: { minimum_reputation: 1, critical_reputation_threshold: 1, reputation_decay_rate: 1 },
      trust_graph: { max_edges_per_node: 200, max_graph_nodes: 100_000, trust_propagation_depth: 10, trust_decay_factor: 1 },
      governance: { governance_trigger_threshold: 1, max_operations_per_cycle: 500, quarantine_threshold: 1 },
      recovery: { recovery_cooldown_blocks: 100_000, recovery_success_threshold: 1 },
    };
    assert.strictEqual(validateTrustPolicy(atMax), true);
  });

  it('loadTrustPolicy: valid JSON object returns validated policy', () => {
    const json = {
      version: '2.0',
      timestamp: 2000,
      anomaly_detection: { anomaly_score_threshold: 0.7, cluster_detection_threshold: 5, anomaly_window_size: 50 },
      reputation: { minimum_reputation: 0.05, critical_reputation_threshold: 0.15, reputation_decay_rate: 0.02 },
      trust_graph: { max_edges_per_node: 100, max_graph_nodes: 100_000, trust_propagation_depth: 5, trust_decay_factor: 0.85 },
      governance: { governance_trigger_threshold: 0.8, max_operations_per_cycle: 30, quarantine_threshold: 0.1 },
      recovery: { recovery_cooldown_blocks: 20, recovery_success_threshold: 0.7 },
    };
    const policy = loadTrustPolicy(json);
    assert.strictEqual(policy.version, '2.0');
    assert.strictEqual(policy.timestamp, 2000);
    assert.strictEqual(policy.anomaly_detection.anomaly_score_threshold, 0.7);
    assert.strictEqual(policy.governance.max_operations_per_cycle, 30);
  });

  it('loadTrustPolicy: missing section throws', () => {
    const json = {
      version: '1.0',
      timestamp: 0,
      anomaly_detection: DEFAULT_TRUST_POLICY.anomaly_detection,
      reputation: DEFAULT_TRUST_POLICY.reputation,
      trust_graph: DEFAULT_TRUST_POLICY.trust_graph,
      governance: DEFAULT_TRUST_POLICY.governance,
      // recovery missing
    };
    assert.throws(() => loadTrustPolicy(json), /missing or invalid section "recovery"/);
  });

  it('loadTrustPolicy: non-object throws', () => {
    assert.throws(() => loadTrustPolicy(null), /policy_json must be an object/);
    assert.throws(() => loadTrustPolicy('string'), /policy_json must be an object/);
  });
});

describe('Trust Policy — Integration', () => {
  it('Registry getPolicy usable after load; pipeline and automation still run with default policy', () => {
    const registry = new TrustPolicyRegistry();
    const policy = registry.getPolicy();
    assert.ok(policy);
    assert.strictEqual(policy.version, DEFAULT_TRUST_POLICY.version);

    const snapshot = {
      timestamp: 5000,
      behavior_profiles: [
        {
          node_id: 'n1',
          total_events: 40,
          action_count: 10,
          consensus_votes: 20,
          validations_performed: 15,
          governance_actions: 2,
          last_activity_timestamp: 5000,
        },
      ],
    };
    const pipeline_result = runTrustPipeline(snapshot);
    const auto_result = runGovernanceAutomation({ pipeline_result });

    assert.ok(pipeline_result.timestamp === 5000);
    assert.ok(Array.isArray(auto_result.execution_ready_operations));
    assert.ok(Array.isArray(auto_result.generated_operations));
    assert.ok(auto_result.execution_ready_operations.length <= 50);
  });

  it('Custom policy with different limits can be loaded and registry returns it', () => {
    const customJson = {
      version: 'custom',
      timestamp: 1,
      anomaly_detection: { anomaly_score_threshold: 0.5, cluster_detection_threshold: 2, anomaly_window_size: 200 },
      reputation: { minimum_reputation: 0.2, critical_reputation_threshold: 0.25, reputation_decay_rate: 0.005 },
      trust_graph: { max_edges_per_node: 100, max_graph_nodes: 100_000, trust_propagation_depth: 5, trust_decay_factor: 0.95 },
      governance: { governance_trigger_threshold: 0.6, max_operations_per_cycle: 10, quarantine_threshold: 0.2 },
      recovery: { recovery_cooldown_blocks: 5, recovery_success_threshold: 0.65 },
    };
    const policy = loadTrustPolicy(customJson);
    const registry = new TrustPolicyRegistry();
    registry.updatePolicy(policy);
    const current = registry.getPolicy();
    assert.strictEqual(current.anomaly_detection.anomaly_score_threshold, 0.5);
    assert.strictEqual(current.governance.max_operations_per_cycle, 10);
  });
});
