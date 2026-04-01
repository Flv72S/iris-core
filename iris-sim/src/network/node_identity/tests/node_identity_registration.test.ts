/**
 * Phase 13XX-A — Node Identity & Registration Layer. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { NodeIdentity, NodeType } from '../node_identity_types.js';
import {
  NodeIdentityRegistry,
  NodeIdentityVerifier,
  NodeOnboardingService,
  NodeIdentityError,
  NodeIdentityErrorCode,
} from '../index.js';

function identity(overrides: Partial<NodeIdentity> & { node_id: string; node_type: NodeType; provider: string }): NodeIdentity {
  return Object.freeze({
    node_id: overrides.node_id,
    node_type: overrides.node_type,
    provider: overrides.provider,
    ...(overrides.public_key !== undefined && { public_key: overrides.public_key }),
    ...(overrides.metadata !== undefined && { metadata: overrides.metadata }),
  });
}

describe('Node Identity Registration (Phase 13XX-A)', () => {
  describe('node registration success', () => {
    it('registers a node and returns it via getRegistration', () => {
      const registry = new NodeIdentityRegistry();
      const id = identity({ node_id: 'node-1', node_type: 'HUMAN', provider: 'Acme' });
      registry.registerNode(id);
      const reg = registry.getRegistration('node-1');
      assert.ok(reg);
      assert.strictEqual(reg!.identity.node_id, 'node-1');
      assert.strictEqual(reg!.identity.node_type, 'HUMAN');
      assert.strictEqual(reg!.status, 'ACTIVE');
      assert.strictEqual(registry.isActive('node-1'), true);
    });
  });

  describe('duplicate registration rejection', () => {
    it('throws NODE_ALREADY_REGISTERED when same node_id registered twice', () => {
      const registry = new NodeIdentityRegistry();
      const id = identity({ node_id: 'dup', node_type: 'MICROSERVICE', provider: 'Internal' });
      registry.registerNode(id);
      assert.throws(
        () => registry.registerNode(id),
        (e: Error) => e instanceof NodeIdentityError && e.code === NodeIdentityErrorCode.NODE_ALREADY_REGISTERED
      );
    });
  });

  describe('identity verification levels', () => {
    it('LOW: accepts node_id + valid node_type only', () => {
      const v = new NodeIdentityVerifier();
      const id = identity({ node_id: 'u1', node_type: 'HUMAN', provider: '' });
      assert.strictEqual(v.verifyIdentity(id, 'LOW'), true);
    });

    it('MEDIUM: requires provider', () => {
      const v = new NodeIdentityVerifier();
      const id = identity({ node_id: 'm1', node_type: 'INTERNAL_SERVICE', provider: 'Acme' });
      assert.strictEqual(v.verifyIdentity(id, 'MEDIUM'), true);
      assert.throws(
        () => v.verifyIdentity(identity({ node_id: 'x', node_type: 'HUMAN', provider: '' }), 'MEDIUM'),
        (e: Error) => e instanceof NodeIdentityError && e.code === NodeIdentityErrorCode.MISSING_REQUIRED_FIELDS
      );
    });

    it('HIGH: requires public_key and provider whitelist', () => {
      const v = new NodeIdentityVerifier();
      const id = identity({
        node_id: 'ai-openai-gpt',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
        public_key: 'public_key_value',
      });
      assert.strictEqual(v.verifyIdentity(id, 'HIGH'), true);
      assert.throws(
        () =>
          v.verifyIdentity(
            identity({ node_id: 'ai2', node_type: 'THIRD_PARTY_AI', provider: 'OpenAI' }),
            'HIGH'
          ),
        (e: Error) => e instanceof NodeIdentityError && e.code === NodeIdentityErrorCode.MISSING_REQUIRED_FIELDS
      );
      assert.throws(
        () =>
          v.verifyIdentity(
            identity({
              node_id: 'ai3',
              node_type: 'THIRD_PARTY_AI',
              provider: 'UnknownVendor',
              public_key: 'pk',
            }),
            'HIGH'
          ),
        (e: Error) => e instanceof NodeIdentityError && e.code === NodeIdentityErrorCode.UNVERIFIED_PROVIDER
      );
    });

    it('rejects invalid node_type', () => {
      const v = new NodeIdentityVerifier();
      assert.throws(
        () =>
          v.verifyIdentity(
            identity({ node_id: 'x', node_type: 'INVALID' as NodeType, provider: 'P' }),
            'LOW'
          ),
        (e: Error) => e instanceof NodeIdentityError && e.code === NodeIdentityErrorCode.INVALID_NODE_TYPE
      );
    });
  });

  describe('node suspension', () => {
    it('suspendNode sets status to SUSPENDED and isActive returns false', () => {
      const registry = new NodeIdentityRegistry();
      registry.registerNode(identity({ node_id: 's1', node_type: 'HUMAN', provider: 'P' }));
      assert.strictEqual(registry.isActive('s1'), true);
      registry.suspendNode('s1');
      assert.strictEqual(registry.isActive('s1'), false);
      assert.strictEqual(registry.getRegistration('s1')!.status, 'SUSPENDED');
    });

    it('suspendNode throws NODE_NOT_FOUND for unknown node', () => {
      const registry = new NodeIdentityRegistry();
      assert.throws(
        () => registry.suspendNode('nonexistent'),
        (e: Error) => e instanceof NodeIdentityError && e.code === NodeIdentityErrorCode.NODE_NOT_FOUND
      );
    });
  });

  describe('node revocation', () => {
    it('revokeNode sets status to REVOKED and isActive returns false', () => {
      const registry = new NodeIdentityRegistry();
      registry.registerNode(identity({ node_id: 'r1', node_type: 'IOT_DEVICE', provider: 'P' }));
      registry.revokeNode('r1');
      assert.strictEqual(registry.isActive('r1'), false);
      assert.strictEqual(registry.getRegistration('r1')!.status, 'REVOKED');
    });

    it('revokeNode throws NODE_NOT_FOUND for unknown node', () => {
      const registry = new NodeIdentityRegistry();
      assert.throws(
        () => registry.revokeNode('nonexistent'),
        (e: Error) => e instanceof NodeIdentityError && e.code === NodeIdentityErrorCode.NODE_NOT_FOUND
      );
    });
  });

  describe('registry determinism', () => {
    it('listNodes returns stable order by node_id', () => {
      const registry = new NodeIdentityRegistry();
      registry.registerNode(identity({ node_id: 'z', node_type: 'HUMAN', provider: 'P' }));
      registry.registerNode(identity({ node_id: 'a', node_type: 'HUMAN', provider: 'P' }));
      registry.registerNode(identity({ node_id: 'm', node_type: 'HUMAN', provider: 'P' }));
      const list = registry.listNodes();
      assert.strictEqual(list.length, 3);
      assert.strictEqual(list[0].identity.node_id, 'a');
      assert.strictEqual(list[1].identity.node_id, 'm');
      assert.strictEqual(list[2].identity.node_id, 'z');
    });
  });

  describe('getNodesByType filter', () => {
    it('returns only registrations matching node_type', () => {
      const registry = new NodeIdentityRegistry();
      registry.registerNode(identity({ node_id: 'h1', node_type: 'HUMAN', provider: 'P' }));
      registry.registerNode(identity({ node_id: 'ai1', node_type: 'THIRD_PARTY_AI', provider: 'OpenAI', public_key: 'pk' }));
      registry.registerNode(identity({ node_id: 'h2', node_type: 'HUMAN', provider: 'P' }));
      const humans = registry.getNodesByType('HUMAN');
      assert.strictEqual(humans.length, 2);
      assert.ok(humans.every((r) => r.identity.node_type === 'HUMAN'));
      const ai = registry.getNodesByType('THIRD_PARTY_AI');
      assert.strictEqual(ai.length, 1);
      assert.strictEqual(ai[0].identity.node_id, 'ai1');
    });
  });

  describe('NodeOnboardingService', () => {
    it('onboardNode with HIGH trust: registry.isActive after onboard', () => {
      const registry = new NodeIdentityRegistry();
      const verifier = new NodeIdentityVerifier();
      const onboarding = new NodeOnboardingService(registry, verifier);
      const id = identity({
        node_id: 'ai-openai-gpt',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
        public_key: 'public_key_value',
      });
      onboarding.onboardNode(id, 'HIGH', 1000);
      assert.strictEqual(registry.isActive('ai-openai-gpt'), true);
      const reg = registry.getRegistration('ai-openai-gpt');
      assert.ok(reg);
      assert.strictEqual(reg!.registered_at, 1000);
      assert.strictEqual(reg!.status, 'ACTIVE');
    });

    it('onboardNode throws when node already registered', () => {
      const registry = new NodeIdentityRegistry();
      registry.registerNode(identity({ node_id: 'existing', node_type: 'HUMAN', provider: 'P' }));
      const onboarding = new NodeOnboardingService(registry, new NodeIdentityVerifier());
      assert.throws(
        () =>
          onboarding.onboardNode(
            identity({ node_id: 'existing', node_type: 'HUMAN', provider: 'P' }),
            'LOW',
            2000
          ),
        (e: Error) => e instanceof NodeIdentityError && e.code === NodeIdentityErrorCode.NODE_ALREADY_REGISTERED
      );
    });

    it('onEvent called on onboard with ONBOARDING kind', () => {
      const registry = new NodeIdentityRegistry();
      const events: Array<{ kind: string; node_id: string }> = [];
      const onboarding = new NodeOnboardingService(registry, new NodeIdentityVerifier(), {
        onEvent: (ev) => events.push({ kind: ev.kind, node_id: ev.node_id }),
      });
      onboarding.onboardNode(
        identity({ node_id: 'ev1', node_type: 'HUMAN', provider: 'P' }),
        'LOW',
        3000
      );
      assert.strictEqual(events.length, 1);
      assert.strictEqual(events[0].kind, 'ONBOARDING');
      assert.strictEqual(events[0].node_id, 'ev1');
    });
  });
});
