/**
 * Phase 11H — Federation Coordination & Consensus Orchestration tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runFederationConsensusOrchestration,
  GOVERNANCE_EXECUTION_ORDER,
  getNextExecutionStage,
} from '../index.js';
import { buildFederationTimeline } from '../federation_timeline_manager.js';
import { generateFederationNotifications } from '../federation_state_notifier.js';
import { buildFederationConsensusState } from '../consensus_state_builder.js';
import type { FederationExecutionStage, FederationStageSnapshot } from '../federation_orchestration_types.js';
import type { NodeTrustIndex } from '../../inter_org_trust/types/trust_types.js';
import type { FederatedTrustCertificate } from '../../trust_certification/types/trust_certificate_types.js';
import type { PredictiveGovernanceSignal } from '../../predictive_governance/predictive_governance_types.js';
import type { GlobalAuditReport } from '../../governance_audit/audit_types.js';

function trustIndex(
  node_id: string,
  organization_id: string,
  trust_index: number,
  trust_level: NodeTrustIndex['trust_level']
): NodeTrustIndex {
  return Object.freeze({
    node_id,
    organization_id,
    declared_trust: trust_index,
    observed_trust: trust_index,
    verified_trust: trust_index,
    trust_index,
    trust_level,
  });
}

function cert(
  node_id: string,
  organization_id: string,
  level: 'GOLD' | 'SILVER' | 'BRONZE'
): FederatedTrustCertificate {
  return Object.freeze({
    node_id,
    organization_id,
    trust_index: 0.9,
    trust_level: 'HIGH',
    certificate_level: level,
    certificate_timestamp: 1000,
    certificate_hash: 'h-' + node_id,
  });
}

function signal(
  node_id: string,
  org_id: string,
  risk_level: PredictiveGovernanceSignal['risk_level']
): PredictiveGovernanceSignal {
  return Object.freeze({
    node_id,
    organization_id: org_id,
    stability_status: 'STABLE',
    risk_level,
    trust_delta: 0,
    volatility_score: 0.1,
    evaluated_timestamp: 2000,
  });
}

function auditReport(overrides: Partial<GlobalAuditReport> = {}): GlobalAuditReport {
  return Object.freeze({
    total_nodes: 2,
    passed_nodes: 2,
    warning_nodes: 0,
    failed_nodes: 0,
    cross_node_consistency: 'PASS',
    audit_results: Object.freeze([]),
    audit_timestamp: 3000,
    ...overrides,
  });
}

describe('Federation Orchestration', () => {
  it('Stage ordering: execution order is deterministic', () => {
    assert.strictEqual(GOVERNANCE_EXECUTION_ORDER.length, 5);
    assert.strictEqual(GOVERNANCE_EXECUTION_ORDER[0], 'TRUST_EVALUATION');
    assert.strictEqual(GOVERNANCE_EXECUTION_ORDER[1], 'CERTIFICATION');
    assert.strictEqual(GOVERNANCE_EXECUTION_ORDER[2], 'PREDICTIVE_ANALYSIS');
    assert.strictEqual(GOVERNANCE_EXECUTION_ORDER[3], 'AUDIT');
    assert.strictEqual(GOVERNANCE_EXECUTION_ORDER[4], 'CONSENSUS_FINALIZATION');
  });

  it('Next stage resolution: null → TRUST_EVALUATION', () => {
    assert.strictEqual(getNextExecutionStage(null), 'TRUST_EVALUATION');
  });

  it('Next stage resolution: TRUST_EVALUATION → CERTIFICATION', () => {
    assert.strictEqual(getNextExecutionStage('TRUST_EVALUATION'), 'CERTIFICATION');
  });

  it('Next stage resolution: CONSENSUS_FINALIZATION → null', () => {
    assert.strictEqual(getNextExecutionStage('CONSENSUS_FINALIZATION'), null);
  });

  it('Next stage resolution: full progression', () => {
    let stage: FederationExecutionStage | null = 'TRUST_EVALUATION';
    const sequence: (FederationExecutionStage | null)[] = [];
    for (let i = 0; i < 6; i++) {
      sequence.push(stage);
      stage = getNextExecutionStage(stage);
    }
    assert.deepStrictEqual(sequence, [
      'TRUST_EVALUATION',
      'CERTIFICATION',
      'PREDICTIVE_ANALYSIS',
      'AUDIT',
      'CONSENSUS_FINALIZATION',
      null,
    ]);
  });

  it('Timeline generation: contains all stages in order', () => {
    const stages: FederationExecutionStage[] = [
      'AUDIT',
      'TRUST_EVALUATION',
      'CERTIFICATION',
      'PREDICTIVE_ANALYSIS',
      'CONSENSUS_FINALIZATION',
    ];
    const timeline = buildFederationTimeline(stages, 100);
    assert.strictEqual(timeline.length, 5);
    assert.strictEqual(timeline[0].stage, 'TRUST_EVALUATION');
    assert.strictEqual(timeline[1].stage, 'CERTIFICATION');
    assert.strictEqual(timeline[2].stage, 'PREDICTIVE_ANALYSIS');
    assert.strictEqual(timeline[3].stage, 'AUDIT');
    assert.strictEqual(timeline[4].stage, 'CONSENSUS_FINALIZATION');
    for (const s of timeline) assert.strictEqual(s.status, 'COMPLETED');
    assert.strictEqual(timeline[0].timestamp, 100);
    assert.strictEqual(timeline[4].timestamp, 104);
  });

  it('Notification generation: message ordering matches timeline', () => {
    const timeline: FederationStageSnapshot[] = [
      Object.freeze({ stage: 'TRUST_EVALUATION', status: 'COMPLETED', timestamp: 1 }),
      Object.freeze({ stage: 'CERTIFICATION', status: 'COMPLETED', timestamp: 2 }),
    ];
    const notifications = generateFederationNotifications(timeline);
    assert.strictEqual(notifications.length, 2);
    assert.strictEqual(notifications[0].message, 'Trust evaluation completed');
    assert.strictEqual(notifications[1].message, 'Certification stage completed');
    assert.strictEqual(notifications[0].timestamp, 1);
    assert.strictEqual(notifications[1].timestamp, 2);
  });

  it('Consensus state: mock data counts', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n1', 'org1', 0.8, 'HIGH'),
      trustIndex('n2', 'org1', 0.7, 'MEDIUM'),
    ];
    const certs: FederatedTrustCertificate[] = [cert('n1', 'org1', 'GOLD')];
    const signals: PredictiveGovernanceSignal[] = [
      signal('n1', 'org1', 'LOW'),
      signal('n2', 'org1', 'LOW'),
    ];
    const report = auditReport({ passed_nodes: 1 });
    const state = buildFederationConsensusState(indices, certs, signals, report);
    assert.strictEqual(state.trust_nodes, 2);
    assert.strictEqual(state.certified_nodes, 1);
    assert.strictEqual(state.predictive_signals, 2);
    assert.strictEqual(state.audit_passed_nodes, 1);
    assert.ok(['LOW', 'MODERATE', 'HIGH', 'SYSTEMIC'].includes(state.systemic_risk_level));
  });

  it('Federation orchestration: full pipeline snapshot structure', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.8, 'HIGH')];
    const certs: FederatedTrustCertificate[] = [cert('n1', 'org1', 'GOLD')];
    const signals: PredictiveGovernanceSignal[] = [signal('n1', 'org1', 'LOW')];
    const report = auditReport();
    const { snapshot, notifications } = runFederationConsensusOrchestration(
      indices,
      certs,
      signals,
      report,
      5000
    );
    assert.strictEqual(snapshot.timeline.length, 5);
    assert.strictEqual(snapshot.finalized, true);
    assert.strictEqual(snapshot.timestamp, 5000);
    assert.strictEqual(snapshot.consensus_state.trust_nodes, 1);
    assert.strictEqual(snapshot.consensus_state.certified_nodes, 1);
    assert.strictEqual(snapshot.consensus_state.predictive_signals, 1);
    assert.strictEqual(snapshot.consensus_state.audit_passed_nodes, 2);
    assert.strictEqual(notifications.length, 5);
    assert.strictEqual(notifications[0].stage, 'TRUST_EVALUATION');
    assert.strictEqual(notifications[4].stage, 'CONSENSUS_FINALIZATION');
  });

  it('Determinism: shuffle inputs → identical consensus snapshot', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n2', 'org1', 0.7, 'MEDIUM'),
      trustIndex('n1', 'org1', 0.8, 'HIGH'),
    ];
    const certs: FederatedTrustCertificate[] = [
      cert('n2', 'org1', 'SILVER'),
      cert('n1', 'org1', 'GOLD'),
    ];
    const signals: PredictiveGovernanceSignal[] = [
      signal('n2', 'org1', 'LOW'),
      signal('n1', 'org1', 'LOW'),
    ];
    const report = auditReport();
    const a = runFederationConsensusOrchestration(indices, certs, signals, report, 1000);
    const b = runFederationConsensusOrchestration(
      [indices[1], indices[0]],
      [certs[1], certs[0]],
      [signals[1], signals[0]],
      report,
      1000
    );
    assert.strictEqual(JSON.stringify(a.snapshot.consensus_state), JSON.stringify(b.snapshot.consensus_state));
    assert.strictEqual(a.snapshot.finalized, b.snapshot.finalized);
    assert.strictEqual(a.snapshot.timeline.length, b.snapshot.timeline.length);
    assert.strictEqual(JSON.stringify(a.snapshot.timeline), JSON.stringify(b.snapshot.timeline));
  });
});
