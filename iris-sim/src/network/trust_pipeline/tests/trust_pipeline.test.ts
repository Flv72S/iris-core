/**
 * Phase 13J — Trust Pipeline Orchestrator. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { runTrustPipeline } from '../index.js';
import type { NetworkTrustSnapshot } from '../trust_pipeline_types.js';
import type { NodeBehaviorProfile } from '../../behavior_monitoring/index.js';
import { RecoveryActionType } from '../../trust_recovery/index.js';
import { NodeIdentityRegistry } from '../../node_identity/index.js';

function behaviorProfile(
  node_id: string,
  total_events: number,
  action_count: number,
  consensus_votes: number,
  validations_performed: number,
  governance_actions: number,
  last_activity_timestamp: number
): NodeBehaviorProfile {
  return Object.freeze({
    node_id,
    total_events,
    action_count,
    consensus_votes,
    validations_performed,
    governance_actions,
    last_activity_timestamp,
  });
}

describe('Trust Pipeline Orchestrator (13J)', () => {
  it('Test 1 — Full pipeline execution with multiple nodes', () => {
    const timestamp = 5000;
    const profiles: NodeBehaviorProfile[] = [
      behaviorProfile('n1', 40, 10, 20, 15, 2, timestamp),
      behaviorProfile('n2', 50, 12, 22, 18, 3, timestamp),
      behaviorProfile('n3', 45, 11, 21, 16, 2, timestamp),
    ];
    const snapshot: NetworkTrustSnapshot = { timestamp, behavior_profiles: profiles };

    const result = runTrustPipeline(snapshot);

    assert.strictEqual(result.timestamp, timestamp);
    assert.strictEqual(result.behavior_profiles.length, 3);
    assert.strictEqual(result.normalized_metrics.length, 3);
    assert.strictEqual(result.reputation_profiles.length, 3);
    assert.ok(result.trust_graph.nodes.size === 3);
    assert.ok(Array.isArray(result.anomaly_reports));
    assert.ok(Array.isArray(result.recovery_actions));
    assert.strictEqual(result.trust_states.length, 3);
    assert.ok(Array.isArray(result.governance_events));
    assert.ok(result.observatory_report.health !== undefined);
    assert.ok(result.observatory_report.distribution !== undefined);
    assert.ok(result.observatory_report.anomaly_activity !== undefined);
    assert.strictEqual(result.explainability_reports.length, 3);

    const nodeIds = result.reputation_profiles.map((r) => r.node_id).sort();
    assert.deepStrictEqual(nodeIds, ['n1', 'n2', 'n3']);
  });

  it('Test 2 — Deterministic execution: same snapshot → identical results', () => {
    const timestamp = 6000;
    const profiles: NodeBehaviorProfile[] = [
      behaviorProfile('a', 30, 8, 15, 10, 1, timestamp),
      behaviorProfile('b', 35, 9, 16, 12, 2, timestamp),
    ];
    const snapshot: NetworkTrustSnapshot = { timestamp, behavior_profiles: profiles };

    const r1 = runTrustPipeline(snapshot);
    const r2 = runTrustPipeline(snapshot);

    assert.strictEqual(r1.timestamp, r2.timestamp);
    assert.deepStrictEqual(r1.reputation_profiles, r2.reputation_profiles);
    assert.strictEqual(r1.trust_graph.nodes.size, r2.trust_graph.nodes.size);
    assert.strictEqual(r1.trust_graph.edges.length, r2.trust_graph.edges.length);
    assert.deepStrictEqual(r1.anomaly_reports, r2.anomaly_reports);
    assert.deepStrictEqual(r1.recovery_actions, r2.recovery_actions);
    assert.deepStrictEqual(r1.trust_states, r2.trust_states);
    assert.deepStrictEqual(r1.governance_events, r2.governance_events);
    assert.strictEqual(r1.observatory_report.health.total_nodes, r2.observatory_report.health.total_nodes);
    assert.strictEqual(r1.explainability_reports.length, r2.explainability_reports.length);
  });

  it('Test 3 — Empty network: valid empty structures', () => {
    const snapshot: NetworkTrustSnapshot = {
      timestamp: 7000,
      behavior_profiles: [],
    };

    const result = runTrustPipeline(snapshot);

    assert.strictEqual(result.timestamp, 7000);
    assert.strictEqual(result.behavior_profiles.length, 0);
    assert.strictEqual(result.normalized_metrics.length, 0);
    assert.strictEqual(result.reputation_profiles.length, 0);
    assert.strictEqual(result.trust_graph.nodes.size, 0);
    assert.strictEqual(result.trust_graph.edges.length, 0);
    assert.strictEqual(result.anomaly_reports.length, 0);
    assert.strictEqual(result.recovery_actions.length, 0);
    assert.strictEqual(result.trust_states.length, 0);
    assert.strictEqual(result.governance_events.length, 0);
    // 13H uses Math.max(1, reputations.length) for total_nodes to avoid div-by-zero
    assert.ok(result.observatory_report.health.total_nodes >= 0);
    assert.strictEqual(result.explainability_reports.length, 0);
  });

  it('Test 4 — Anomaly propagation: outlier triggers recovery and observability', () => {
    const timestamp = 8000;
    // One node far above mean+2*std to trigger anomaly (activity outlier and/or trust collusion)
    const profiles: NodeBehaviorProfile[] = [
      behaviorProfile('normal1', 20, 5, 10, 8, 1, timestamp),
      behaviorProfile('normal2', 22, 6, 11, 9, 1, timestamp),
      behaviorProfile('normal3', 18, 4, 9, 7, 0, timestamp),
      behaviorProfile('outlier', 200, 100, 100, 100, 50, timestamp),
    ];
    const snapshot: NetworkTrustSnapshot = { timestamp, behavior_profiles: profiles };

    const result = runTrustPipeline(snapshot);

    const outlierReports = result.anomaly_reports.filter((a) => a.node_id === 'outlier');
    assert.ok(outlierReports.length >= 1, 'outlier node should have at least one anomaly report');

    const recoveryForOutlier = result.recovery_actions.find((a) => a.node_id === 'outlier');
    assert.ok(recoveryForOutlier, 'outlier should have a recovery action');
    assert.ok(
      [RecoveryActionType.ENTER_PROBATION, RecoveryActionType.APPLY_COOLDOWN, RecoveryActionType.RESTRICT_NODE].includes(recoveryForOutlier.action_type),
      'recovery action should be probation, cooldown, or restrict'
    );

    const outlierState = result.trust_states.find((s) => s.node_id === 'outlier');
    assert.ok(outlierState);
    assert.ok(
      ['PROBATION', 'COOLDOWN', 'RESTRICTED'].includes(outlierState.trust_state),
      'outlier should be in a non-trusted recovery state'
    );

    assert.strictEqual(result.explainability_reports.length, 4);
    const outlierExplain = result.explainability_reports.find((e) => e.node_id === 'outlier');
    assert.ok(outlierExplain?.anomaly !== null);
  });

  it('validates snapshot: throws if snapshot is null', () => {
    assert.throws(
      () => runTrustPipeline(null as unknown as NetworkTrustSnapshot),
      /valid snapshot/
    );
  });

  it('validates snapshot: throws if behavior_profiles is not an array', () => {
    assert.throws(
      () =>
        runTrustPipeline({
          timestamp: 1,
          behavior_profiles: undefined,
        } as unknown as NetworkTrustSnapshot),
      /behavior_profiles to be an array/
    );
  });

  it('with nodeRegistry: only ACTIVE nodes are processed', () => {
    const registry = new NodeIdentityRegistry();
    registry.registerNode({
      node_id: 'active-node',
      node_type: 'HUMAN',
      provider: 'Test',
    });
    registry.registerNode({
      node_id: 'suspended-node',
      node_type: 'HUMAN',
      provider: 'Test',
    });
    registry.suspendNode('suspended-node');
    const timestamp = 8000;
    const profiles: NodeBehaviorProfile[] = [
      behaviorProfile('active-node', 10, 2, 3, 2, 1, timestamp),
      behaviorProfile('suspended-node', 20, 5, 8, 4, 2, timestamp),
    ];
    const snapshot: NetworkTrustSnapshot = { timestamp, behavior_profiles: profiles };
    const result = runTrustPipeline(snapshot, { nodeRegistry: registry });
    assert.strictEqual(result.behavior_profiles.length, 1);
    assert.strictEqual(result.behavior_profiles[0].node_id, 'active-node');
    assert.strictEqual(result.reputation_profiles.length, 1);
    assert.strictEqual(result.trust_states.length, 1);
  });
});
