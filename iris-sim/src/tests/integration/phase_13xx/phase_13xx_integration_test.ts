/**
 * Phase 13XX — Integration Validation.
 * Validates: Node Identity (A) → Passport (C) → Anomaly (D) → Governance (E).
 * Deterministic; no randomness. Optional: Trust Decay (B) for propagation.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  NodeIdentityRegistry,
  NodeIdentityVerifier,
  NodeOnboardingService,
} from '../../../network/node_identity/index.js';
import {
  NodePassportRegistry,
  NodePassportUpdater,
} from '../../../network/node_passport/index.js';
import {
  TrustDecayPolicyProvider,
  TrustDecayCalculator,
  DEFAULT_TRUST_DECAY_POLICY,
} from '../../../network/trust_graph_scalable/index.js';
import {
  AnomalyRuleRegistry,
  AnomalyDetector,
  AnomalyEngine,
  TrustSpikeRule,
} from '../../../network/anomaly_detection/index.js';
import type { NodePassport } from '../../../network/node_passport/index.js';
import type { AnomalyEvent } from '../../../network/anomaly_detection/index.js';
import {
  GovernancePolicyRegistry,
  GovernanceDecisionEngine,
  GovernanceActionExecutor,
  HighSeverityAnomalyPolicy,
  type GovernancePolicy,
} from '../../../network/governance_engine/index.js';

const NODE_ID = 'ai-test-node';
const DETECTED_AT = 10_000;
const DECIDED_AT = 11_000;

/** Policy that suspends on large TRUST_SPIKE (delta >= 0.5) for integration flow. */
class TrustSpikeSuspensionPolicy implements GovernancePolicy {
  readonly id = 'trust_spike_suspension_policy';
  evaluate(passport: NodePassport, anomalies: readonly AnomalyEvent[], decided_at: number) {
    const spike = anomalies.find(
      (a) => a.anomaly_type === 'TRUST_SPIKE' && (a.severity === 'MEDIUM' || a.severity === 'HIGH')
    );
    if (spike == null) return null;
    return {
      node_id: passport.node_id,
      action: 'SUSPEND_NODE' as const,
      reason: 'Trust spike anomaly detected',
      severity: spike.severity,
      decided_at,
    };
  }
}

function runWorkflow(timestamp: number): {
  passportAfterAnomaly: NodePassport;
  decisions: ReturnType<GovernanceDecisionEngine['evaluateNode']>;
  isActiveAfterExecute: boolean;
} {
  const nodeRegistry = new NodeIdentityRegistry();
  const verifier = new NodeIdentityVerifier();
  const onboarding = new NodeOnboardingService(nodeRegistry, verifier);
  const passportRegistry = new NodePassportRegistry();
  const passportUpdater = new NodePassportUpdater(passportRegistry);

  const identity = {
    node_id: NODE_ID,
    node_type: 'THIRD_PARTY_AI' as const,
    provider: 'OpenAI',
    public_key: 'test_public_key',
  };
  onboarding.onboardNode(identity, 'HIGH', timestamp);
  passportRegistry.createPassport(identity, nodeRegistry.getRegistration(NODE_ID)!, timestamp);

  const passportRecord = passportRegistry.getPassport(NODE_ID)!;
  let passportAfterAnomaly = passportRecord.passport;

  const anomalyRuleRegistry = new AnomalyRuleRegistry();
  anomalyRuleRegistry.registerRule(new TrustSpikeRule());
  const detector = new AnomalyDetector(anomalyRuleRegistry);
  const anomalyEngine = new AnomalyEngine(detector, passportUpdater);
  const context = {
    node_id: NODE_ID,
    trust_score: 0.8,
    previous_trust_score: 0.1,
    node_type: 'THIRD_PARTY_AI',
    detected_at: DETECTED_AT,
  };
  anomalyEngine.process(context);
  passportAfterAnomaly = passportRegistry.getPassport(NODE_ID)!.passport;

  const govPolicyRegistry = new GovernancePolicyRegistry();
  govPolicyRegistry.registerPolicy(new HighSeverityAnomalyPolicy());
  govPolicyRegistry.registerPolicy(new TrustSpikeSuspensionPolicy());
  const govEngine = new GovernanceDecisionEngine(govPolicyRegistry);
  const anomaliesForGov = [
    {
      node_id: NODE_ID,
      anomaly_type: 'TRUST_SPIKE' as const,
      severity: 'MEDIUM' as const,
      description: 'Unexpected trust increase',
      detected_at: DETECTED_AT,
    },
  ];
  const decisionsWithAnomalies = govEngine.evaluateNode(
    passportAfterAnomaly,
    anomaliesForGov,
    DECIDED_AT
  );

  const executor = new GovernanceActionExecutor(nodeRegistry, passportUpdater);
  for (const d of decisionsWithAnomalies) {
    executor.execute(d);
  }
  const isActiveAfterExecute = nodeRegistry.isActive(NODE_ID);

  return {
    passportAfterAnomaly,
    decisions: decisionsWithAnomalies,
    isActiveAfterExecute,
  };
}

describe('Phase 13XX Integration', () => {
  it('Step 1–2: Initialize services and register test node', () => {
    const nodeRegistry = new NodeIdentityRegistry();
    const verifier = new NodeIdentityVerifier();
    const onboarding = new NodeOnboardingService(nodeRegistry, verifier);
    const identity = {
      node_id: NODE_ID,
      node_type: 'THIRD_PARTY_AI' as const,
      provider: 'OpenAI',
      public_key: 'test_public_key',
    };
    onboarding.onboardNode(identity, 'HIGH', 1000);
    assert.strictEqual(nodeRegistry.isActive(NODE_ID), true);
  });

  it('Step 3: Create passport after onboarding — initial state', () => {
    const nodeRegistry = new NodeIdentityRegistry();
    const verifier = new NodeIdentityVerifier();
    const onboarding = new NodeOnboardingService(nodeRegistry, verifier);
    const passportRegistry = new NodePassportRegistry();
    const identity = {
      node_id: NODE_ID,
      node_type: 'THIRD_PARTY_AI' as const,
      provider: 'OpenAI',
      public_key: 'test_public_key',
    };
    onboarding.onboardNode(identity, 'HIGH', 2000);
    const reg = nodeRegistry.getRegistration(NODE_ID)!;
    passportRegistry.createPassport(identity, reg, 2000);
    const passport = passportRegistry.getPassport(NODE_ID)!.passport;
    assert.strictEqual(passport.trust_score, 0);
    assert.strictEqual(passport.reputation_score, 0);
    assert.strictEqual(passport.anomaly_count, 0);
    assert.deepStrictEqual(passport.governance_flags, []);
  });

  it('Step 4–6: Trust update, anomaly detection, passport update', () => {
    const nodeRegistry = new NodeIdentityRegistry();
    const verifier = new NodeIdentityVerifier();
    const onboarding = new NodeOnboardingService(nodeRegistry, verifier);
    const passportRegistry = new NodePassportRegistry();
    const passportUpdater = new NodePassportUpdater(passportRegistry);
    const identity = {
      node_id: NODE_ID,
      node_type: 'THIRD_PARTY_AI' as const,
      provider: 'OpenAI',
      public_key: 'test_public_key',
    };
    onboarding.onboardNode(identity, 'HIGH', 3000);
    passportRegistry.createPassport(identity, nodeRegistry.getRegistration(NODE_ID)!, 3000);
    const ruleRegistry = new AnomalyRuleRegistry();
    ruleRegistry.registerRule(new TrustSpikeRule());
    const detector = new AnomalyDetector(ruleRegistry);
    const anomalyEngine = new AnomalyEngine(detector, passportUpdater);
    const context = {
      node_id: NODE_ID,
      trust_score: 0.8,
      previous_trust_score: 0.1,
      node_type: 'THIRD_PARTY_AI',
      detected_at: DETECTED_AT,
    };
    const events = anomalyEngine.process(context);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].anomaly_type, 'TRUST_SPIKE');
    assert.ok(events[0].severity === 'MEDIUM' || events[0].severity === 'HIGH');
    const passport = passportRegistry.getPassport(NODE_ID)!.passport;
    assert.strictEqual(passport.anomaly_count, 1);
    assert.strictEqual(passport.last_anomaly_timestamp, DETECTED_AT);
  });

  it('Step 7–8: Governance evaluation and execution — suspension', () => {
    const result = runWorkflow(5000);
    assert.ok(result.decisions.length >= 1);
    const actions = result.decisions.map((d) => d.action);
    const allowed = ['FLAG_UNDER_REVIEW', 'LIMIT_PROPAGATION', 'SUSPEND_NODE'];
    assert.ok(
      result.decisions.some((d) => allowed.includes(d.action)),
      `Expected at least one of ${allowed.join(', ')}, got ${actions.join(', ')}`
    );
    assert.strictEqual(result.isActiveAfterExecute, false);
  });

  it('Determinism: run workflow twice — identical outputs and passport state', () => {
    const run1 = runWorkflow(20_000);
    const run2 = runWorkflow(20_000);
    assert.strictEqual(run1.passportAfterAnomaly.anomaly_count, run2.passportAfterAnomaly.anomaly_count);
    assert.strictEqual(run1.passportAfterAnomaly.last_anomaly_timestamp, run2.passportAfterAnomaly.last_anomaly_timestamp);
    assert.strictEqual(run1.decisions.length, run2.decisions.length);
    assert.deepStrictEqual(
      run1.decisions.map((d) => ({ action: d.action, node_id: d.node_id })),
      run2.decisions.map((d) => ({ action: d.action, node_id: d.node_id }))
    );
    assert.strictEqual(run1.isActiveAfterExecute, run2.isActiveAfterExecute);
  });

  it('Failure condition: passport updated after anomaly', () => {
    const nodeRegistry = new NodeIdentityRegistry();
    const onboarding = new NodeOnboardingService(nodeRegistry, new NodeIdentityVerifier());
    const passportRegistry = new NodePassportRegistry();
    const passportUpdater = new NodePassportUpdater(passportRegistry);
    const identity = {
      node_id: NODE_ID,
      node_type: 'THIRD_PARTY_AI' as const,
      provider: 'OpenAI',
      public_key: 'pk',
    };
    onboarding.onboardNode(identity, 'HIGH', 0);
    passportRegistry.createPassport(identity, nodeRegistry.getRegistration(NODE_ID)!, 0);
    const ruleRegistry = new AnomalyRuleRegistry();
    ruleRegistry.registerRule(new TrustSpikeRule());
    const anomalyEngine = new AnomalyEngine(
      new AnomalyDetector(ruleRegistry),
      passportUpdater
    );
    anomalyEngine.process({
      node_id: NODE_ID,
      trust_score: 0.9,
      previous_trust_score: 0.2,
      detected_at: 1,
    });
    const passport = passportRegistry.getPassport(NODE_ID)!.passport;
    assert.ok(passport.anomaly_count >= 1);
    assert.ok(passport.last_anomaly_timestamp !== undefined);
  });

  it('Performance: 1000 nodes — anomaly detection under 100ms per batch', () => {
    const nodeRegistry = new NodeIdentityRegistry();
    const verifier = new NodeIdentityVerifier();
    const onboarding = new NodeOnboardingService(nodeRegistry, verifier);
    const passportRegistry = new NodePassportRegistry();
    const passportUpdater = new NodePassportUpdater(passportRegistry);
    const ruleRegistry = new AnomalyRuleRegistry();
    ruleRegistry.registerRule(new TrustSpikeRule());
    const detector = new AnomalyDetector(ruleRegistry);
    const anomalyEngine = new AnomalyEngine(detector, passportUpdater);
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const node_id = `node-${i}`;
      const identity = {
        node_id,
        node_type: 'HUMAN' as const,
        provider: 'P',
      };
      onboarding.onboardNode(identity, 'LOW', 0);
      passportRegistry.createPassport(identity, nodeRegistry.getRegistration(node_id)!, 0);
    }
    const start = performance.now();
    for (let i = 0; i < n; i++) {
      anomalyEngine.process({
        node_id: `node-${i}`,
        trust_score: 0.8,
        previous_trust_score: 0.1,
        detected_at: 1,
      });
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `Anomaly detection for ${n} nodes took ${elapsed}ms, expected < 100ms`);
  });

  it('All core services instantiate with deterministic config', () => {
    const nodeRegistry = new NodeIdentityRegistry();
    const verifier = new NodeIdentityVerifier();
    const onboarding = new NodeOnboardingService(nodeRegistry, verifier);
    const passportRegistry = new NodePassportRegistry();
    const passportUpdater = new NodePassportUpdater(passportRegistry);
    const decayProvider = new TrustDecayPolicyProvider(DEFAULT_TRUST_DECAY_POLICY);
    const decayCalculator = new TrustDecayCalculator(decayProvider);
    const ruleRegistry = new AnomalyRuleRegistry();
    const detector = new AnomalyDetector(ruleRegistry);
    const anomalyEngine = new AnomalyEngine(detector, passportUpdater);
    const govPolicyRegistry = new GovernancePolicyRegistry();
    const govEngine = new GovernanceDecisionEngine(govPolicyRegistry);
    const executor = new GovernanceActionExecutor(nodeRegistry, passportUpdater);
    assert.ok(nodeRegistry !== undefined);
    assert.ok(onboarding !== undefined);
    assert.ok(anomalyEngine !== undefined);
    assert.strictEqual(decayCalculator.computeDecayFactor('HUMAN'), 0.9);
    const minimalPassport: NodePassport = {
      node_id: 'x',
      identity: { node_id: 'x', node_type: 'HUMAN', provider: 'P' },
      registration: { identity: { node_id: 'x', node_type: 'HUMAN', provider: 'P' }, registered_at: 0, status: 'ACTIVE' },
      trust_score: 0,
      reputation_score: 0,
      anomaly_count: 0,
      governance_flags: [],
      created_at: 0,
      updated_at: 0,
    };
    assert.strictEqual(govEngine.evaluateNode(minimalPassport, [], 0).length, 0);
    assert.ok(executor !== undefined);
  });
});
