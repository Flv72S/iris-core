/**
 * Phase 13XX-D — Multi-Layer Anomaly Detection. Tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  AnomalyRuleRegistry,
  AnomalyDetector,
  AnomalyEngine,
  TrustSpikeRule,
  type AnomalyContext,
} from '../index.js';
import { NodePassportRegistry, NodePassportUpdater } from '../../node_passport/index.js';
import type { NodeIdentity, NodeRegistration } from '../../node_identity/index.js';

function identity(node_id: string): NodeIdentity {
  return Object.freeze({ node_id, node_type: 'HUMAN', provider: 'Test' });
}
function registration(id: NodeIdentity, at: number): NodeRegistration {
  return Object.freeze({ identity: id, registered_at: at, status: 'ACTIVE' });
}

describe('Anomaly Multi-Layer (Phase 13XX-D)', () => {
  describe('rule registration', () => {
    it('registerRule and listRules return rules in order', () => {
      const registry = new AnomalyRuleRegistry();
      assert.strictEqual(registry.listRules().length, 0);
      registry.registerRule(new TrustSpikeRule());
      assert.strictEqual(registry.listRules().length, 1);
      assert.strictEqual(registry.listRules()[0].id, 'trust_spike_rule');
    });
  });

  describe('single rule detection', () => {
    it('TrustSpikeRule fires when trust increase > 0.4', () => {
      const registry = new AnomalyRuleRegistry();
      registry.registerRule(new TrustSpikeRule());
      const detector = new AnomalyDetector(registry);
      const context: AnomalyContext = {
        node_id: 'n1',
        trust_score: 0.9,
        previous_trust_score: 0.4,
        detected_at: 1000,
      };
      const events = detector.detect(context);
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].anomaly_type, 'TRUST_SPIKE');
      assert.strictEqual(events[0].severity, 'MEDIUM');
      assert.strictEqual(events[0].node_id, 'n1');
      assert.strictEqual(events[0].detected_at, 1000);
    });

    it('TrustSpikeRule returns null when increase <= 0.4', () => {
      const registry = new AnomalyRuleRegistry();
      registry.registerRule(new TrustSpikeRule());
      const detector = new AnomalyDetector(registry);
      const context: AnomalyContext = {
        node_id: 'n2',
        trust_score: 0.5,
        previous_trust_score: 0.2,
        detected_at: 2000,
      };
      const events = detector.detect(context);
      assert.strictEqual(events.length, 0);
    });

    it('TrustSpikeRule returns null when previous_trust_score missing', () => {
      const registry = new AnomalyRuleRegistry();
      registry.registerRule(new TrustSpikeRule());
      const detector = new AnomalyDetector(registry);
      const context: AnomalyContext = { node_id: 'n3', trust_score: 0.9, detected_at: 3000 };
      const events = detector.detect(context);
      assert.strictEqual(events.length, 0);
    });
  });

  describe('multiple rule detection', () => {
    it('multiple rules can fire for same context', () => {
      const registry = new AnomalyRuleRegistry();
      registry.registerRule(new TrustSpikeRule());
      registry.registerRule(new TrustSpikeRule()); // same rule twice - both fire if we register twice
      const detector = new AnomalyDetector(registry);
      const context: AnomalyContext = {
        node_id: 'n4',
        trust_score: 0.95,
        previous_trust_score: 0.5,
        detected_at: 4000,
      };
      const events = detector.detect(context);
      assert.ok(events.length >= 1);
    });
  });

  describe('no anomaly scenario', () => {
    it('detect returns empty array when no rule fires', () => {
      const registry = new AnomalyRuleRegistry();
      registry.registerRule(new TrustSpikeRule());
      const detector = new AnomalyDetector(registry);
      const context: AnomalyContext = { node_id: 'n5', trust_score: 0.3, detected_at: 5000 };
      const events = detector.detect(context);
      assert.strictEqual(events.length, 0);
    });
  });

  describe('passport update integration', () => {
    it('AnomalyEngine updates passport anomaly_count and last_anomaly_timestamp', () => {
      const passportRegistry = new NodePassportRegistry();
      const id = identity('p1');
      passportRegistry.createPassport(id, registration(id, 0), 0);
      const passportUpdater = new NodePassportUpdater(passportRegistry);
      const ruleRegistry = new AnomalyRuleRegistry();
      ruleRegistry.registerRule(new TrustSpikeRule());
      const engine = new AnomalyEngine(new AnomalyDetector(ruleRegistry), passportUpdater);
      const context: AnomalyContext = {
        node_id: 'p1',
        trust_score: 0.9,
        previous_trust_score: 0.4,
        detected_at: 6000,
      };
      const events = engine.process(context);
      assert.strictEqual(events.length, 1);
      const record = passportRegistry.getPassport('p1')!;
      assert.strictEqual(record.passport.anomaly_count, 1);
      assert.strictEqual(record.passport.last_anomaly_timestamp, 6000);
    });

    it('AnomalyEngine adds UNDER_REVIEW when severity is HIGH', () => {
      const passportRegistry = new NodePassportRegistry();
      const id = identity('p2');
      passportRegistry.createPassport(id, registration(id, 0), 0);
      const passportUpdater = new NodePassportUpdater(passportRegistry);
      const ruleRegistry = new AnomalyRuleRegistry();
      ruleRegistry.registerRule({
        id: 'high_severity_rule',
        anomaly_type: 'BEHAVIORAL_DEVIATION',
        evaluate: (ctx) => ({
          node_id: ctx.node_id,
          anomaly_type: 'BEHAVIORAL_DEVIATION',
          severity: 'HIGH',
          description: 'Test',
          detected_at: ctx.detected_at,
        }),
      });
      const engine = new AnomalyEngine(new AnomalyDetector(ruleRegistry), passportUpdater);
      const context: AnomalyContext = { node_id: 'p2', trust_score: 0.5, detected_at: 7000 };
      engine.process(context);
      const record = passportRegistry.getPassport('p2')!;
      assert.ok(record.passport.governance_flags.includes('UNDER_REVIEW'));
    });

    it('MEDIUM severity does not add UNDER_REVIEW', () => {
      const passportRegistry = new NodePassportRegistry();
      const id = identity('p3');
      passportRegistry.createPassport(id, registration(id, 0), 0);
      const passportUpdater = new NodePassportUpdater(passportRegistry);
      const ruleRegistry = new AnomalyRuleRegistry();
      ruleRegistry.registerRule(new TrustSpikeRule());
      const engine = new AnomalyEngine(new AnomalyDetector(ruleRegistry), passportUpdater);
      const context: AnomalyContext = {
        node_id: 'p3',
        trust_score: 0.9,
        previous_trust_score: 0.4,
        detected_at: 8000,
      };
      engine.process(context);
      const record = passportRegistry.getPassport('p3')!;
      assert.strictEqual(record.passport.anomaly_count, 1);
      assert.strictEqual(record.passport.governance_flags.length, 0);
    });
  });

  describe('severity classification', () => {
    it('events have correct severity', () => {
      const registry = new AnomalyRuleRegistry();
      registry.registerRule(new TrustSpikeRule());
      const detector = new AnomalyDetector(registry);
      const context: AnomalyContext = {
        node_id: 's1',
        trust_score: 0.95,
        previous_trust_score: 0.5,
        detected_at: 9000,
      };
      const events = detector.detect(context);
      assert.strictEqual(events[0].severity, 'MEDIUM');
    });
  });

  describe('observability', () => {
    it('onAnomalyRecorded called for each detected event', () => {
      const passportRegistry = new NodePassportRegistry();
      const id = identity('obs');
      passportRegistry.createPassport(id, registration(id, 0), 0);
      const passportUpdater = new NodePassportUpdater(passportRegistry);
      const ruleRegistry = new AnomalyRuleRegistry();
      ruleRegistry.registerRule(new TrustSpikeRule());
      let count = 0;
      const engine = new AnomalyEngine(new AnomalyDetector(ruleRegistry), passportUpdater, {
        onAnomalyRecorded: () => { count += 1; },
      });
      const context: AnomalyContext = {
        node_id: 'obs',
        trust_score: 0.9,
        previous_trust_score: 0.4,
        detected_at: 10000,
      };
      engine.process(context);
      assert.strictEqual(count, 1);
    });
  });
});
