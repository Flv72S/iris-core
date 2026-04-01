/**
 * Phase 13XX-C — Node Passport System. Tests.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { NodeIdentity, NodeRegistration } from '../../node_identity/index.js';
import {
  NodePassportRegistry,
  NodePassportRecord,
  NodePassportUpdater,
  NodePassportError,
  NodePassportErrorCode,
  isValidScore,
  clampScore,
} from '../index.js';

function identity(overrides: Partial<NodeIdentity> & { node_id: string; node_type: NodeIdentity['node_type']; provider: string }): NodeIdentity {
  return Object.freeze({
    node_id: overrides.node_id,
    node_type: overrides.node_type,
    provider: overrides.provider,
    ...(overrides.public_key !== undefined && { public_key: overrides.public_key }),
  });
}

function registration(identity: NodeIdentity, registered_at: number, status: NodeRegistration['status']): NodeRegistration {
  return Object.freeze({ identity, registered_at, status: status ?? 'ACTIVE' });
}

describe('Node Passport (Phase 13XX-C)', () => {
  describe('passport creation', () => {
    it('createPassport returns record with identity, registration, zero scores', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'n1', node_type: 'HUMAN', provider: 'P' });
      const reg = registration(id, 1000, 'ACTIVE');
      const record = registry.createPassport(id, reg, 1000);
      const p = record.passport;
      assert.strictEqual(p.node_id, 'n1');
      assert.strictEqual(p.trust_score, 0);
      assert.strictEqual(p.reputation_score, 0);
      assert.strictEqual(p.anomaly_count, 0);
      assert.deepStrictEqual(p.governance_flags, []);
      assert.strictEqual(p.created_at, 1000);
      assert.strictEqual(p.updated_at, 1000);
    });
  });

  describe('trust update validation', () => {
    it('updateTrust accepts score in [0, 1]', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'n2', node_type: 'HUMAN', provider: 'P' });
      const record = registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      record.updateTrust(0.72, 2000);
      assert.strictEqual(record.passport.trust_score, 0.72);
      assert.strictEqual(record.passport.updated_at, 2000);
    });

    it('updateTrust throws for score out of range', () => {
      const record = new NodePassportRecord({
        node_id: 'x',
        identity: identity({ node_id: 'x', node_type: 'HUMAN', provider: 'P' }),
        registration: registration(identity({ node_id: 'x', node_type: 'HUMAN', provider: 'P' }), 0, 'ACTIVE'),
        trust_score: 0,
        reputation_score: 0,
        anomaly_count: 0,
        governance_flags: [],
        created_at: 0,
        updated_at: 0,
      });
      assert.throws(
        () => record.updateTrust(1.5, 0),
        (e: Error) => e instanceof NodePassportError && e.code === NodePassportErrorCode.INVALID_TRUST_SCORE
      );
      assert.throws(
        () => record.updateTrust(-0.1, 0),
        (e: Error) => e instanceof NodePassportError && e.code === NodePassportErrorCode.INVALID_TRUST_SCORE
      );
    });
  });

  describe('reputation update validation', () => {
    it('updateReputation accepts score in [0, 1]', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'n3', node_type: 'THIRD_PARTY_AI', provider: 'OpenAI' });
      const record = registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      record.updateReputation(0.65, 3000);
      assert.strictEqual(record.passport.reputation_score, 0.65);
    });

    it('updateReputation throws for score out of range', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'y', node_type: 'HUMAN', provider: 'P' });
      const record = registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      assert.throws(
        () => record.updateReputation(2, 0),
        (e: Error) => e instanceof NodePassportError && e.code === NodePassportErrorCode.INVALID_REPUTATION_SCORE
      );
    });
  });

  describe('anomaly recording', () => {
    it('recordAnomaly increments count and sets last_anomaly_timestamp', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'n4', node_type: 'IOT_DEVICE', provider: 'P' });
      const record = registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      record.recordAnomaly(5000, 5000);
      assert.strictEqual(record.passport.anomaly_count, 1);
      assert.strictEqual(record.passport.last_anomaly_timestamp, 5000);
      record.recordAnomaly(6000, 6000);
      assert.strictEqual(record.passport.anomaly_count, 2);
      assert.strictEqual(record.passport.last_anomaly_timestamp, 6000);
    });
  });

  describe('governance flag management', () => {
    it('addGovernanceFlag and removeGovernanceFlag', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'n5', node_type: 'HUMAN', provider: 'P' });
      const record = registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      record.addGovernanceFlag('UNDER_REVIEW', 7000);
      assert.deepStrictEqual(record.passport.governance_flags, ['UNDER_REVIEW']);
      record.addGovernanceFlag('HIGH_RISK', 7001);
      assert.ok(record.passport.governance_flags.includes('UNDER_REVIEW'));
      assert.ok(record.passport.governance_flags.includes('HIGH_RISK'));
      record.removeGovernanceFlag('UNDER_REVIEW', 7002);
      assert.deepStrictEqual(record.passport.governance_flags, ['HIGH_RISK']);
    });
  });

  describe('registry retrieval', () => {
    it('getPassport returns record by node_id', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'ai-openai-gpt', node_type: 'THIRD_PARTY_AI', provider: 'OpenAI' });
      registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      const record = registry.getPassport('ai-openai-gpt');
      assert.ok(record !== undefined);
      assert.strictEqual(record!.passport.node_id, 'ai-openai-gpt');
    });

    it('getPassport returns undefined for unknown node', () => {
      const registry = new NodePassportRegistry();
      assert.strictEqual(registry.getPassport('unknown'), undefined);
    });

    it('listPassports returns deterministic order by node_id', () => {
      const registry = new NodePassportRegistry();
      const ids = ['z', 'a', 'm'];
      for (const node_id of ids) {
        const id = identity({ node_id, node_type: 'HUMAN', provider: 'P' });
        registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      }
      const list = registry.listPassports();
      assert.strictEqual(list.length, 3);
      assert.strictEqual(list[0].passport.node_id, 'a');
      assert.strictEqual(list[1].passport.node_id, 'm');
      assert.strictEqual(list[2].passport.node_id, 'z');
    });
  });

  describe('deterministic updates', () => {
    it('same sequence of updates produces same passport state', () => {
      const id = identity({ node_id: 'd1', node_type: 'HUMAN', provider: 'P' });
      const reg = registration(id, 0, 'ACTIVE');
      const r1 = new NodePassportRecord({
        node_id: id.node_id,
        identity: id,
        registration: reg,
        trust_score: 0,
        reputation_score: 0,
        anomaly_count: 0,
        governance_flags: [],
        created_at: 0,
        updated_at: 0,
      });
      const r2 = new NodePassportRecord({ ...r1.passport });
      const ts = 10000;
      r1.updateTrust(0.5, ts);
      r1.updateReputation(0.6, ts);
      r1.recordAnomaly(ts, ts);
      r1.addGovernanceFlag('UNDER_REVIEW', ts);
      r2.updateTrust(0.5, ts);
      r2.updateReputation(0.6, ts);
      r2.recordAnomaly(ts, ts);
      r2.addGovernanceFlag('UNDER_REVIEW', ts);
      assert.strictEqual(r1.passport.trust_score, r2.passport.trust_score);
      assert.strictEqual(r1.passport.reputation_score, r2.passport.reputation_score);
      assert.strictEqual(r1.passport.anomaly_count, r2.passport.anomaly_count);
      assert.deepStrictEqual(r1.passport.governance_flags, r2.passport.governance_flags);
    });
  });

  describe('NodePassportUpdater', () => {
    it('updateTrustScore and updateReputationScore update passport', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'u1', node_type: 'HUMAN', provider: 'P' });
      registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      const updater = new NodePassportUpdater(registry);
      updater.updateTrustScore('u1', 0.72, 2000);
      updater.updateReputationScore('u1', 0.65, 2001);
      const record = registry.getPassport('u1')!;
      assert.strictEqual(record.passport.trust_score, 0.72);
      assert.strictEqual(record.passport.reputation_score, 0.65);
    });

    it('recordAnomaly and applyGovernanceFlag', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'u2', node_type: 'HUMAN', provider: 'P' });
      registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      const updater = new NodePassportUpdater(registry);
      updater.recordAnomaly('u2', 3000);
      updater.applyGovernanceFlag('u2', 'UNDER_REVIEW', 3001);
      const record = registry.getPassport('u2')!;
      assert.strictEqual(record.passport.anomaly_count, 1);
      assert.strictEqual(record.passport.last_anomaly_timestamp, 3000);
      assert.deepStrictEqual(record.passport.governance_flags, ['UNDER_REVIEW']);
    });

    it('throws PASSPORT_NOT_FOUND when node has no passport', () => {
      const registry = new NodePassportRegistry();
      const updater = new NodePassportUpdater(registry);
      assert.throws(
        () => updater.updateTrustScore('missing', 0.5, 0),
        (e: Error) => e instanceof NodePassportError && e.code === NodePassportErrorCode.PASSPORT_NOT_FOUND
      );
    });

    it('onPassportUpdate called for each update', () => {
      const registry = new NodePassportRegistry();
      const id = identity({ node_id: 'obs', node_type: 'HUMAN', provider: 'P' });
      registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      const events: Array<{ node_id: string; kind: string }> = [];
      const updater = new NodePassportUpdater(registry, {
        onPassportUpdate: (node_id, kind) => events.push({ node_id, kind }),
      });
      updater.updateTrustScore('obs', 0.5, 0);
      updater.recordAnomaly('obs', 1);
      updater.applyGovernanceFlag('obs', 'UNDER_REVIEW', 2);
      assert.strictEqual(events.length, 3);
      assert.strictEqual(events[0].kind, 'trust');
      assert.strictEqual(events[1].kind, 'anomaly');
      assert.strictEqual(events[2].kind, 'governance');
    });
  });

  describe('example passport', () => {
    it('passport reflects current system state (ai-openai-gpt)', () => {
      const registry = new NodePassportRegistry();
      const id = identity({
        node_id: 'ai-openai-gpt',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
        public_key: 'pk',
      });
      registry.createPassport(id, registration(id, 0, 'ACTIVE'), 0);
      const updater = new NodePassportUpdater(registry);
      updater.updateTrustScore('ai-openai-gpt', 0.72, 1000);
      updater.updateReputationScore('ai-openai-gpt', 0.65, 1001);
      updater.recordAnomaly('ai-openai-gpt', 1002);
      updater.applyGovernanceFlag('ai-openai-gpt', 'UNDER_REVIEW', 1003);
      const record = registry.getPassport('ai-openai-gpt')!;
      const p = record.passport;
      assert.strictEqual(p.node_id, 'ai-openai-gpt');
      assert.strictEqual(p.trust_score, 0.72);
      assert.strictEqual(p.reputation_score, 0.65);
      assert.strictEqual(p.anomaly_count, 1);
      assert.deepStrictEqual(p.governance_flags, ['UNDER_REVIEW']);
    });
  });

  describe('score helpers', () => {
    it('isValidScore and clampScore', () => {
      assert.strictEqual(isValidScore(0), true);
      assert.strictEqual(isValidScore(1), true);
      assert.strictEqual(isValidScore(0.5), true);
      assert.strictEqual(isValidScore(-0.1), false);
      assert.strictEqual(isValidScore(1.1), false);
      assert.strictEqual(clampScore(1.5), 1);
      assert.strictEqual(clampScore(-0.5), 0);
    });
  });
});
