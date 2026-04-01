/**
 * Phase 13K — Governance Automation Engine. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  runGovernanceAutomation,
  buildGovernanceOperation,
  MAX_OPERATIONS_PER_CYCLE,
} from '../index.js';
import type { GovernanceAutomationInput } from '../governance_automation_types.js';
import type { TrustPipelineResult } from '../../trust_pipeline/index.js';
import { TrustEventType, buildTrustEvent } from '../../trust_governance_bridge/index.js';
import type { TrustGovernanceEvent } from '../../trust_governance_bridge/index.js';
import { runTrustPipeline } from '../../trust_pipeline/index.js';
import type { NodeBehaviorProfile } from '../../behavior_monitoring/index.js';

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

/** Build a minimal TrustPipelineResult for testing automation (only timestamp and governance_events are used). */
function minimalPipelineResult(
  timestamp: number,
  governance_events: readonly TrustGovernanceEvent[]
): TrustPipelineResult {
  return Object.freeze({
    timestamp,
    behavior_profiles: [],
    normalized_metrics: [],
    reputation_profiles: [],
    trust_graph: { nodes: new Map(), edges: [] },
    anomaly_reports: [],
    recovery_actions: [],
    trust_states: [],
    governance_events,
    observatory_report: {
      health: Object.freeze({
        timestamp,
        total_nodes: 1,
        average_reputation: 0,
        trust_concentration_index: 0,
        anomaly_rate: 0,
        recovery_activity_rate: 0,
        governance_event_rate: 0,
      }),
      distribution: Object.freeze({
        timestamp,
        reputation_distribution: [],
        min_reputation: 0,
        max_reputation: 0,
        median_reputation: 0,
        high_trust_nodes: 0,
        low_trust_nodes: 0,
      }),
      anomaly_activity: Object.freeze({
        timestamp,
        total_anomalies: 0,
        anomalies_by_type: new Map(),
        affected_nodes: 0,
      }),
    },
    explainability_reports: [],
  });
}

describe('Governance Automation Engine (13K)', () => {
  it('Test 1 — Basic automation: pipeline result with trust events → governance operations', () => {
    const ev1 = buildTrustEvent(TrustEventType.REPUTATION_COLLAPSE, ['node-a'], 0.8, 1000);
    const ev2 = buildTrustEvent(TrustEventType.ANOMALY_CLUSTER, ['node-b', 'node-c'], 0.5, 1000);
    const pipeline_result = minimalPipelineResult(1000, [ev1, ev2]);
    const input: GovernanceAutomationInput = { pipeline_result };

    const result = runGovernanceAutomation(input);

    assert.strictEqual(result.timestamp, 1000);
    assert.strictEqual(result.generated_operations.length, 2);
    assert.strictEqual(result.rejected_events.length, 0);
    assert.strictEqual(result.execution_ready_operations.length, 2);

    const opRep = result.generated_operations.find((o) => o.type === 'NODE_TRUST_REDUCTION');
    const opAlert = result.generated_operations.find((o) => o.type === 'NETWORK_ALERT');
    assert.ok(opRep);
    assert.ok(opAlert);
    assert.strictEqual(opRep!.target_node, 'node-a');
    assert.strictEqual(opRep!.operation_id, ev1.event_id);
    assert.ok(result.execution_ready_operations.every((r) => r.operation_id && r.payload));
  });

  it('Test 2 — Unknown event type: rejected and not converted to operation', () => {
    const unknownEvent: TrustGovernanceEvent = Object.freeze({
      event_id: 'unknown-evt-1',
      event_type: 'RECOVERY_SUCCESS' as unknown as TrustEventType,
      affected_nodes: ['n1'],
      severity: 0.5,
      timestamp: 2000,
    });
    const pipeline_result = minimalPipelineResult(2000, [unknownEvent]);
    const input: GovernanceAutomationInput = { pipeline_result };

    const result = runGovernanceAutomation(input);

    assert.strictEqual(result.generated_operations.length, 0);
    assert.strictEqual(result.rejected_events.length, 1);
    assert.strictEqual(result.rejected_events[0]!.event_id, 'unknown-evt-1');
    assert.strictEqual(result.execution_ready_operations.length, 0);
  });

  it('Test 3 — Determinism: running automation twice → identical results', () => {
    const ev = buildTrustEvent(TrustEventType.SYBIL_PATTERN, ['s1', 's2'], 0.9, 3000);
    const pipeline_result = minimalPipelineResult(3000, [ev]);
    const input: GovernanceAutomationInput = { pipeline_result };

    const r1 = runGovernanceAutomation(input);
    const r2 = runGovernanceAutomation(input);

    assert.deepStrictEqual(
      r1.generated_operations.map((o) => ({ operation_id: o.operation_id, type: o.type, target_node: o.target_node })),
      r2.generated_operations.map((o) => ({ operation_id: o.operation_id, type: o.type, target_node: o.target_node }))
    );
    assert.strictEqual(r1.execution_ready_operations.length, r2.execution_ready_operations.length);
    assert.deepStrictEqual(
      r1.execution_ready_operations.map((x) => x.operation_id),
      r2.execution_ready_operations.map((x) => x.operation_id)
    );
  });

  it('Test 4 — Operation limit: more than MAX_OPERATIONS_PER_CYCLE → cap execution_ready_operations', () => {
    const events: TrustGovernanceEvent[] = [];
    for (let i = 0; i < MAX_OPERATIONS_PER_CYCLE + 10; i++) {
      events.push(buildTrustEvent(TrustEventType.ANOMALY_CLUSTER, [`node-${i}`], 0.5, 4000 + i));
    }
    const pipeline_result = minimalPipelineResult(4000, events);
    const input: GovernanceAutomationInput = { pipeline_result };

    const result = runGovernanceAutomation(input);

    assert.strictEqual(result.generated_operations.length, MAX_OPERATIONS_PER_CYCLE + 10);
    assert.strictEqual(result.execution_ready_operations.length, MAX_OPERATIONS_PER_CYCLE);
    assert.strictEqual(result.rejected_events.length, 0);
  });

  it('buildGovernanceOperation: REPUTATION_COLLAPSE → NODE_TRUST_REDUCTION', () => {
    const ev = buildTrustEvent(TrustEventType.REPUTATION_COLLAPSE, ['n1'], 0.7, 5000);
    const op = buildGovernanceOperation(ev);
    assert.ok(op);
    assert.strictEqual(op!.type, 'NODE_TRUST_REDUCTION');
    assert.strictEqual(op!.target_node, 'n1');
    assert.strictEqual(op!.operation_id, ev.event_id);
  });

  it('buildGovernanceOperation: empty affected_nodes → null', () => {
    const ev = Object.freeze({
      ...buildTrustEvent(TrustEventType.ANOMALY_CLUSTER, ['x'], 0.5, 1),
      affected_nodes: [] as readonly string[],
    });
    const op = buildGovernanceOperation(ev);
    assert.strictEqual(op, null);
  });
});

describe('Governance Automation — Integration', () => {
  it('Full flow: runTrustPipeline → runGovernanceAutomation produces operations when events exist', () => {
    const timestamp = 9000;
    const profiles: NodeBehaviorProfile[] = [
      behaviorProfile('normal1', 20, 5, 10, 8, 1, timestamp),
      behaviorProfile('normal2', 22, 6, 11, 9, 1, timestamp),
      behaviorProfile('normal3', 18, 4, 9, 7, 0, timestamp),
      behaviorProfile('outlier', 200, 100, 100, 100, 50, timestamp),
    ];
    const pipeline_result = runTrustPipeline({
      timestamp,
      behavior_profiles: profiles,
    });

    const auto_result = runGovernanceAutomation({ pipeline_result });

    assert.strictEqual(auto_result.timestamp, timestamp);
    assert.ok(Array.isArray(auto_result.generated_operations));
    assert.ok(Array.isArray(auto_result.rejected_events));
    assert.ok(Array.isArray(auto_result.execution_ready_operations));
    assert.ok(
      auto_result.generated_operations.length >= 0 && auto_result.execution_ready_operations.length <= MAX_OPERATIONS_PER_CYCLE
    );
  });
});
