/**
 * Phase 13XX-F — Trust Explainability Engine. Tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { NodePassport } from '../../node_passport/index.js';
import type { GovernanceFlag } from '../../node_passport/index.js';
import type { AnomalyEvent } from '../../anomaly_detection/index.js';
import type { GovernanceDecision } from '../../governance_engine/index.js';
import {
  TrustExplainer,
  AnomalyExplainer,
  GovernanceExplainer,
  NodeExplainabilityService,
} from '../index.js';

function makePassport(
  node_id: string,
  overrides?: Partial<Pick<NodePassport, 'trust_score' | 'reputation_score' | 'anomaly_count' | 'governance_flags'>>
): NodePassport {
  const identity = Object.freeze({ node_id, node_type: 'HUMAN' as const, provider: 'P' });
  const registration = Object.freeze({ identity, registered_at: 0, status: 'ACTIVE' as const });
  const defaultFlags: readonly GovernanceFlag[] = Object.freeze(['UNDER_REVIEW' as const]);
  return Object.freeze({
    node_id,
    identity,
    registration,
    trust_score: overrides?.trust_score ?? 0.35,
    reputation_score: overrides?.reputation_score ?? 0.3,
    anomaly_count: overrides?.anomaly_count ?? 1,
    governance_flags: overrides?.governance_flags ?? defaultFlags,
    created_at: 0,
    updated_at: 0,
  });
}

describe('Trust Explainability (Phase 13XX-F)', () => {
  describe('trust explanation generation', () => {
    it('TrustExplainer produces factors from passport', () => {
      const explainer = new TrustExplainer();
      const passport = makePassport('n1');
      const factors = explainer.explainTrust(passport);
      assert.ok(factors.length >= 1);
      assert.ok(factors.some((f) => f.type === 'TRUST_PROPAGATION'));
      assert.ok(factors.some((f) => f.type === 'TRUST_DECAY'));
      assert.ok(factors.some((f) => f.type === 'GOVERNANCE_DECISION'));
    });

    it('TrustExplainer includes governance flags in description', () => {
      const explainer = new TrustExplainer();
      const passport = makePassport('n2', { governance_flags: ['UNDER_REVIEW', 'HIGH_RISK'] as const });
      const factors = explainer.explainTrust(passport);
      const gov = factors.find((f) => f.type === 'GOVERNANCE_DECISION');
      assert.ok(gov !== undefined);
      assert.ok(gov.description.includes('UNDER_REVIEW'));
    });
  });

  describe('anomaly explanation generation', () => {
    it('AnomalyExplainer produces factors from events', () => {
      const explainer = new AnomalyExplainer();
      const anomalies: AnomalyEvent[] = [
        Object.freeze({
          node_id: 'a1',
          anomaly_type: 'TRUST_SPIKE',
          severity: 'MEDIUM',
          description: 'Unexpected trust increase',
          detected_at: 1000,
        }),
      ];
      const factors = explainer.explainAnomalies(anomalies);
      assert.strictEqual(factors.length, 1);
      assert.strictEqual(factors[0].type, 'ANOMALY_EVENT');
      assert.ok(factors[0].description.includes('TRUST_SPIKE'));
      assert.ok(factors[0].description.includes('MEDIUM'));
    });

    it('AnomalyExplainer handles empty array', () => {
      const explainer = new AnomalyExplainer();
      const factors = explainer.explainAnomalies([]);
      assert.strictEqual(factors.length, 0);
    });
  });

  describe('governance explanation generation', () => {
    it('GovernanceExplainer produces factors from decisions', () => {
      const explainer = new GovernanceExplainer();
      const decisions: GovernanceDecision[] = [
        Object.freeze({
          node_id: 'g1',
          action: 'SUSPEND_NODE',
          reason: 'Critical anomaly detected',
          severity: 'CRITICAL',
          decided_at: 2000,
        }),
      ];
      const factors = explainer.explainGovernance(decisions);
      assert.strictEqual(factors.length, 1);
      assert.strictEqual(factors[0].type, 'GOVERNANCE_DECISION');
      assert.ok(factors[0].description.includes('SUSPEND_NODE'));
      assert.ok(factors[0].description.includes('CRITICAL'));
    });
  });

  describe('full node explanation', () => {
    it('NodeExplainabilityService aggregates all factors', () => {
      const service = new NodeExplainabilityService(
        new TrustExplainer(),
        new AnomalyExplainer(),
        new GovernanceExplainer()
      );
      const passport = makePassport('ai-test-node', {
        trust_score: 0.35,
        reputation_score: 0.3,
        anomaly_count: 1,
        governance_flags: ['UNDER_REVIEW'],
      });
      const anomalies: AnomalyEvent[] = [
        Object.freeze({
          node_id: 'ai-test-node',
          anomaly_type: 'TRUST_SPIKE',
          severity: 'MEDIUM',
          description: 'Trust spike detected between 0.1 and 0.8',
          detected_at: 3000,
        }),
      ];
      const decisions: GovernanceDecision[] = [
        Object.freeze({
          node_id: 'ai-test-node',
          action: 'FLAG_UNDER_REVIEW',
          reason: 'Anomaly detected',
          severity: 'MEDIUM',
          decided_at: 4000,
        }),
      ];
      const explanation = service.explainNode(passport, anomalies, decisions);
      assert.strictEqual(explanation.node_id, 'ai-test-node');
      assert.strictEqual(explanation.trust_score, 0.35);
      assert.strictEqual(explanation.reputation_score, 0.3);
      assert.strictEqual(explanation.anomaly_count, 1);
      assert.deepStrictEqual(explanation.governance_flags, ['UNDER_REVIEW']);
      assert.ok(explanation.summary.length > 0);
      assert.ok(explanation.factors.length >= 2);
    });
  });

  describe('deterministic output verification', () => {
    it('same inputs produce identical TrustExplanation', () => {
      const service = new NodeExplainabilityService(
        new TrustExplainer(),
        new AnomalyExplainer(),
        new GovernanceExplainer()
      );
      const passport = makePassport('d1');
      const anomalies: AnomalyEvent[] = [];
      const decisions: GovernanceDecision[] = [];
      const r1 = service.explainNode(passport, anomalies, decisions);
      const r2 = service.explainNode(passport, anomalies, decisions);
      assert.strictEqual(r1.node_id, r2.node_id);
      assert.strictEqual(r1.trust_score, r2.trust_score);
      assert.strictEqual(r1.summary, r2.summary);
      assert.strictEqual(r1.factors.length, r2.factors.length);
      assert.deepStrictEqual(
        r1.factors.map((f) => ({ type: f.type, description: f.description })),
        r2.factors.map((f) => ({ type: f.type, description: f.description }))
      );
    });
  });
});
