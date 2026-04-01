/**
 * Phase 13XX-E — Governance Decision Engine. Tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { NodePassport } from '../../node_passport/index.js';
import type { AnomalyEvent } from '../../anomaly_detection/index.js';
import {
  GovernancePolicyRegistry,
  GovernanceDecisionEngine,
  GovernanceActionExecutor,
  HighSeverityAnomalyPolicy,
  type GovernanceDecision,
} from '../index.js';
import { NodeIdentityRegistry } from '../../node_identity/index.js';
import { NodePassportRegistry, NodePassportUpdater } from '../../node_passport/index.js';

function makePassport(node_id: string, overrides?: Partial<NodePassport>): NodePassport {
  const identity = Object.freeze({ node_id, node_type: 'HUMAN' as const, provider: 'Test' });
  const registration = Object.freeze({ identity, registered_at: 0, status: 'ACTIVE' as const });
  return Object.freeze({
    node_id,
    identity,
    registration,
    trust_score: 0.5,
    reputation_score: 0.5,
    anomaly_count: 0,
    governance_flags: [],
    created_at: 0,
    updated_at: 0,
    ...overrides,
  });
}

function anomaly(node_id: string, severity: AnomalyEvent['severity'], detected_at: number): AnomalyEvent {
  return Object.freeze({
    node_id,
    anomaly_type: 'TRUST_SPIKE',
    severity,
    description: 'Test',
    detected_at,
  });
}

describe('Governance Engine (Phase 13XX-E)', () => {
  describe('policy registration', () => {
    it('registerPolicy and listPolicies return policies in order', () => {
      const registry = new GovernancePolicyRegistry();
      assert.strictEqual(registry.listPolicies().length, 0);
      registry.registerPolicy(new HighSeverityAnomalyPolicy());
      assert.strictEqual(registry.listPolicies().length, 1);
      assert.strictEqual(registry.listPolicies()[0].id, 'high_severity_anomaly_policy');
    });
  });

  describe('single policy decision', () => {
    it('HighSeverityAnomalyPolicy returns SUSPEND_NODE when CRITICAL anomaly', () => {
      const registry = new GovernancePolicyRegistry();
      registry.registerPolicy(new HighSeverityAnomalyPolicy());
      const engine = new GovernanceDecisionEngine(registry);
      const passport = makePassport('n1');
      const anomalies: AnomalyEvent[] = [anomaly('n1', 'CRITICAL', 1000)];
      const decisions = engine.evaluateNode(passport, anomalies, 2000);
      assert.strictEqual(decisions.length, 1);
      assert.strictEqual(decisions[0].action, 'SUSPEND_NODE');
      assert.strictEqual(decisions[0].node_id, 'n1');
      assert.strictEqual(decisions[0].severity, 'CRITICAL');
      assert.strictEqual(decisions[0].decided_at, 2000);
    });

    it('HighSeverityAnomalyPolicy returns null when no CRITICAL anomaly', () => {
      const registry = new GovernancePolicyRegistry();
      registry.registerPolicy(new HighSeverityAnomalyPolicy());
      const engine = new GovernanceDecisionEngine(registry);
      const passport = makePassport('n2');
      const anomalies: AnomalyEvent[] = [anomaly('n2', 'MEDIUM', 1000)];
      const decisions = engine.evaluateNode(passport, anomalies, 2000);
      assert.strictEqual(decisions.length, 0);
    });
  });

  describe('multiple policy decisions', () => {
    it('multiple policies can each return a decision', () => {
      const registry = new GovernancePolicyRegistry();
      registry.registerPolicy(new HighSeverityAnomalyPolicy());
      registry.registerPolicy({
        id: 'flag_under_review_policy',
        evaluate: (p, anomalies, decided_at) => {
          if (anomalies.some((a) => a.severity === 'HIGH'))
            return { node_id: p.node_id, action: 'FLAG_UNDER_REVIEW', reason: 'High severity', severity: 'HIGH' as const, decided_at };
          return null;
        },
      });
      const engine = new GovernanceDecisionEngine(registry);
      const passport = makePassport('n3');
      const anomalies: AnomalyEvent[] = [
        anomaly('n3', 'CRITICAL', 1000),
        anomaly('n3', 'HIGH', 1001),
      ];
      const decisions = engine.evaluateNode(passport, anomalies, 3000);
      assert.ok(decisions.length >= 1);
      const actions = decisions.map((d) => d.action);
      assert.ok(actions.includes('SUSPEND_NODE'));
      assert.ok(actions.includes('FLAG_UNDER_REVIEW'));
    });
  });

  describe('action executor integration', () => {
    it('execute FLAG_UNDER_REVIEW applies passport flag', () => {
      const nodeRegistry = new NodeIdentityRegistry();
      nodeRegistry.registerNode({ node_id: 'e1', node_type: 'HUMAN', provider: 'P' });
      const passportRegistry = new NodePassportRegistry();
      passportRegistry.createPassport(
        { node_id: 'e1', node_type: 'HUMAN', provider: 'P' },
        { identity: { node_id: 'e1', node_type: 'HUMAN', provider: 'P' }, registered_at: 0, status: 'ACTIVE' },
        0
      );
      const passportUpdater = new NodePassportUpdater(passportRegistry);
      const executor = new GovernanceActionExecutor(nodeRegistry, passportUpdater);
      const decision: GovernanceDecision = {
        node_id: 'e1',
        action: 'FLAG_UNDER_REVIEW',
        reason: 'Test',
        severity: 'MEDIUM',
        decided_at: 4000,
      };
      executor.execute(decision);
      const record = passportRegistry.getPassport('e1')!;
      assert.ok(record.passport.governance_flags.includes('UNDER_REVIEW'));
    });

    it('execute LIMIT_PROPAGATION applies LIMITED_PROPAGATION flag', () => {
      const nodeRegistry = new NodeIdentityRegistry();
      nodeRegistry.registerNode({ node_id: 'e2', node_type: 'HUMAN', provider: 'P' });
      const passportRegistry = new NodePassportRegistry();
      passportRegistry.createPassport(
        { node_id: 'e2', node_type: 'HUMAN', provider: 'P' },
        { identity: { node_id: 'e2', node_type: 'HUMAN', provider: 'P' }, registered_at: 0, status: 'ACTIVE' },
        0
      );
      const passportUpdater = new NodePassportUpdater(passportRegistry);
      const executor = new GovernanceActionExecutor(nodeRegistry, passportUpdater);
      executor.execute({
        node_id: 'e2',
        action: 'LIMIT_PROPAGATION',
        reason: 'Test',
        severity: 'HIGH',
        decided_at: 5000,
      });
      const record = passportRegistry.getPassport('e2')!;
      assert.ok(record.passport.governance_flags.includes('LIMITED_PROPAGATION'));
    });
  });

  describe('node suspension logic', () => {
    it('execute SUSPEND_NODE calls nodeRegistry.suspendNode', () => {
      const nodeRegistry = new NodeIdentityRegistry();
      nodeRegistry.registerNode({ node_id: 'sus', node_type: 'HUMAN', provider: 'P' });
      const passportRegistry = new NodePassportRegistry();
      passportRegistry.createPassport(
        { node_id: 'sus', node_type: 'HUMAN', provider: 'P' },
        { identity: { node_id: 'sus', node_type: 'HUMAN', provider: 'P' }, registered_at: 0, status: 'ACTIVE' },
        0
      );
      const executor = new GovernanceActionExecutor(nodeRegistry, new NodePassportUpdater(passportRegistry));
      assert.strictEqual(nodeRegistry.isActive('sus'), true);
      executor.execute({
        node_id: 'sus',
        action: 'SUSPEND_NODE',
        reason: 'Critical anomaly',
        severity: 'CRITICAL',
        decided_at: 6000,
      });
      assert.strictEqual(nodeRegistry.isActive('sus'), false);
    });
  });

  describe('node revocation logic', () => {
    it('execute REVOKE_NODE calls nodeRegistry.revokeNode', () => {
      const nodeRegistry = new NodeIdentityRegistry();
      nodeRegistry.registerNode({ node_id: 'rev', node_type: 'HUMAN', provider: 'P' });
      const passportRegistry = new NodePassportRegistry();
      passportRegistry.createPassport(
        { node_id: 'rev', node_type: 'HUMAN', provider: 'P' },
        { identity: { node_id: 'rev', node_type: 'HUMAN', provider: 'P' }, registered_at: 0, status: 'ACTIVE' },
        0
      );
      const executor = new GovernanceActionExecutor(nodeRegistry, new NodePassportUpdater(passportRegistry));
      executor.execute({
        node_id: 'rev',
        action: 'REVOKE_NODE',
        reason: 'Revocation',
        severity: 'CRITICAL',
        decided_at: 7000,
      });
      assert.strictEqual(nodeRegistry.isActive('rev'), false);
      assert.strictEqual(nodeRegistry.getRegistration('rev')!.status, 'REVOKED');
    });
  });

  describe('NO_ACTION and ESCALATE_MANUAL_REVIEW', () => {
    it('execute NO_ACTION does nothing', () => {
      const nodeRegistry = new NodeIdentityRegistry();
      nodeRegistry.registerNode({ node_id: 'no', node_type: 'HUMAN', provider: 'P' });
      const passportRegistry = new NodePassportRegistry();
      passportRegistry.createPassport(
        { node_id: 'no', node_type: 'HUMAN', provider: 'P' },
        { identity: { node_id: 'no', node_type: 'HUMAN', provider: 'P' }, registered_at: 0, status: 'ACTIVE' },
        0
      );
      const executor = new GovernanceActionExecutor(nodeRegistry, new NodePassportUpdater(passportRegistry));
      executor.execute({
        node_id: 'no',
        action: 'NO_ACTION',
        reason: 'None',
        severity: 'LOW',
        decided_at: 8000,
      });
      assert.strictEqual(nodeRegistry.isActive('no'), true);
    });

    it('execute ESCALATE_MANUAL_REVIEW applies UNDER_REVIEW and calls onManualReviewEscalation', () => {
      const nodeRegistry = new NodeIdentityRegistry();
      nodeRegistry.registerNode({ node_id: 'esc', node_type: 'HUMAN', provider: 'P' });
      const passportRegistry = new NodePassportRegistry();
      passportRegistry.createPassport(
        { node_id: 'esc', node_type: 'HUMAN', provider: 'P' },
        { identity: { node_id: 'esc', node_type: 'HUMAN', provider: 'P' }, registered_at: 0, status: 'ACTIVE' },
        0
      );
      let captured: GovernanceDecision | undefined;
      const executor = new GovernanceActionExecutor(nodeRegistry, new NodePassportUpdater(passportRegistry), {
        onManualReviewEscalation: (d) => { captured = d; },
      });
      const decision: GovernanceDecision = {
        node_id: 'esc',
        action: 'ESCALATE_MANUAL_REVIEW',
        reason: 'Manual review',
        severity: 'HIGH',
        decided_at: 9000,
      };
      executor.execute(decision);
      assert.ok(passportRegistry.getPassport('esc')!.passport.governance_flags.includes('UNDER_REVIEW'));
      assert.strictEqual(captured?.action, 'ESCALATE_MANUAL_REVIEW');
    });
  });
});
