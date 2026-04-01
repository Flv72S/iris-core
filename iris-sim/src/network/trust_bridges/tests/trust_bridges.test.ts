/**
 * Phase 13XX-H — Cross-Network Trust Bridges. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { NodeIdentity } from '../../node_identity/index.js';
import {
  NodeIdentityRegistry,
  NodeIdentityVerifier,
  NodeOnboardingService,
} from '../../node_identity/index.js';
import {
  BridgeRegistry,
  ExternalNodeAdapter,
  BridgeValidator,
  TrustBridgeService,
  BridgeError,
  BridgeErrorCode,
  isValidBridgeType,
} from '../index.js';
import type { TrustBridge } from '../trust_bridge_interface.js';
import type { ExternalIdentity } from '../external_identity.js';

function createMockBridge(
  bridge_id: string,
  resolved: NodeIdentity
): TrustBridge {
  return {
    bridge_id,
    bridge_type: 'AI_PROVIDER',
    resolveIdentity(_external: ExternalIdentity): NodeIdentity {
      return resolved;
    },
    validateInteraction(_external: ExternalIdentity, _payload: unknown): boolean {
      return true;
    },
  };
}

describe('Trust Bridges (Phase 13XX-H)', () => {
  describe('bridge registration', () => {
    it('registers a bridge and returns it via getBridge', () => {
      const registry = new BridgeRegistry();
      const identity: NodeIdentity = {
        node_id: 'ai-openai-gpt',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
      };
      const bridge = createMockBridge('ai-bridge', identity);
      registry.registerBridge(bridge);
      const got = registry.getBridge('ai-bridge');
      assert.ok(got);
      assert.strictEqual(got!.bridge_id, 'ai-bridge');
      assert.strictEqual(got!.bridge_type, 'AI_PROVIDER');
    });

    it('getBridge returns null for unknown bridge_id', () => {
      const registry = new BridgeRegistry();
      assert.strictEqual(registry.getBridge('nonexistent'), null);
    });

    it('listBridges returns all registered bridges', () => {
      const registry = new BridgeRegistry();
      const b1 = createMockBridge('b1', { node_id: 'n1', node_type: 'THIRD_PARTY_AI', provider: 'P' });
      const b2 = createMockBridge('b2', { node_id: 'n2', node_type: 'THIRD_PARTY_AI', provider: 'P' });
      registry.registerBridge(b1);
      registry.registerBridge(b2);
      const list = registry.listBridges();
      assert.strictEqual(list.length, 2);
      assert.ok(list.some((b) => b.bridge_id === 'b1'));
      assert.ok(list.some((b) => b.bridge_id === 'b2'));
    });
  });

  describe('external identity adaptation', () => {
    it('adapter produces NodeIdentity from external identity via bridge', () => {
      const adapter = new ExternalNodeAdapter();
      const resolved: NodeIdentity = {
        node_id: 'ai-openai-gpt',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
      };
      const bridge = createMockBridge('ai', resolved);
      const external: ExternalIdentity = {
        external_id: 'gpt',
        provider: 'OpenAI',
        bridge_type: 'AI_PROVIDER',
      };
      const out = adapter.adapt(external, bridge);
      assert.strictEqual(out.node_id, 'ai-openai-gpt');
      assert.strictEqual(out.node_type, 'THIRD_PARTY_AI');
      assert.strictEqual(out.provider, 'OpenAI');
    });
  });

  describe('invalid bridge rejection', () => {
    it('BridgeValidator rejects bridge with empty bridge_id', () => {
      const validator = new BridgeValidator();
      const bridge = createMockBridge('ok', { node_id: 'n', node_type: 'THIRD_PARTY_AI', provider: 'P' });
      const bad = { ...bridge, bridge_id: '' };
      assert.strictEqual(validator.validateBridge(bad as unknown as TrustBridge), false);
    });

    it('BridgeValidator rejects bridge with invalid bridge_type', () => {
      const validator = new BridgeValidator();
      const bridge = createMockBridge('ok', { node_id: 'n', node_type: 'THIRD_PARTY_AI', provider: 'P' });
      const bad = { ...bridge, bridge_type: 'INVALID_TYPE' };
      assert.strictEqual(validator.validateBridge(bad as unknown as TrustBridge), false);
    });

    it('BridgeValidator rejects bridge without resolveIdentity', () => {
      const validator = new BridgeValidator();
      const bridge = createMockBridge('ok', { node_id: 'n', node_type: 'THIRD_PARTY_AI', provider: 'P' });
      const bad = { ...bridge, resolveIdentity: undefined };
      assert.strictEqual(validator.validateBridge(bad as unknown as TrustBridge), false);
    });

    it('BridgeValidator rejects bridge without validateInteraction', () => {
      const validator = new BridgeValidator();
      const bridge = createMockBridge('ok', { node_id: 'n', node_type: 'THIRD_PARTY_AI', provider: 'P' });
      const bad = { ...bridge, validateInteraction: undefined };
      assert.strictEqual(validator.validateBridge(bad as unknown as TrustBridge), false);
    });

    it('BridgeValidator accepts valid bridge', () => {
      const validator = new BridgeValidator();
      const bridge = createMockBridge('ok', { node_id: 'n', node_type: 'THIRD_PARTY_AI', provider: 'P' });
      assert.strictEqual(validator.validateBridge(bridge), true);
    });
  });

  describe('deterministic identity mapping', () => {
    it('same external identity + same bridge yields same NodeIdentity', () => {
      const adapter = new ExternalNodeAdapter();
      const resolved: NodeIdentity = {
        node_id: 'ai-openai-gpt',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
      };
      const bridge = createMockBridge('ai', resolved);
      const external: ExternalIdentity = {
        external_id: 'gpt',
        provider: 'OpenAI',
        bridge_type: 'AI_PROVIDER',
      };
      const a = adapter.adapt(external, bridge);
      const b = adapter.adapt(external, bridge);
      assert.strictEqual(a.node_id, b.node_id);
      assert.strictEqual(a.node_type, b.node_type);
      assert.strictEqual(a.provider, b.provider);
    });
  });

  describe('TrustBridgeService.registerExternalNode', () => {
    it('returns NodeIdentity when bridge exists', () => {
      const registry = new BridgeRegistry();
      const resolved: NodeIdentity = {
        node_id: 'ai-openai-gpt',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
      };
      registry.registerBridge(createMockBridge('ai-bridge', resolved));
      const service = new TrustBridgeService(registry, new ExternalNodeAdapter());
      const external: ExternalIdentity = {
        external_id: 'gpt',
        provider: 'OpenAI',
        bridge_type: 'AI_PROVIDER',
      };
      const identity = service.registerExternalNode(external, 'ai-bridge');
      assert.strictEqual(identity.node_id, 'ai-openai-gpt');
    });

    it('throws BRIDGE_NOT_FOUND when bridge_id not in registry', () => {
      const registry = new BridgeRegistry();
      const service = new TrustBridgeService(registry, new ExternalNodeAdapter());
      const external: ExternalIdentity = {
        external_id: 'x',
        provider: 'P',
        bridge_type: 'AI_PROVIDER',
      };
      assert.throws(
        () => service.registerExternalNode(external, 'missing'),
        (e: Error) => e instanceof BridgeError && e.code === BridgeErrorCode.BRIDGE_NOT_FOUND
      );
    });
  });

  describe('external node onboarding', () => {
    it('adapted node can be onboarded and is active', () => {
      const nodeRegistry = new NodeIdentityRegistry();
      const verifier = new NodeIdentityVerifier();
      const onboarding = new NodeOnboardingService(nodeRegistry, verifier);

      const bridgeRegistry = new BridgeRegistry();
      const resolved: NodeIdentity = {
        node_id: 'ai-openai-gpt',
        node_type: 'THIRD_PARTY_AI',
        provider: 'OpenAI',
        public_key: 'pk',
      };
      bridgeRegistry.registerBridge(createMockBridge('ai', resolved));
      const service = new TrustBridgeService(bridgeRegistry, new ExternalNodeAdapter());
      const external: ExternalIdentity = {
        external_id: 'gpt',
        provider: 'OpenAI',
        bridge_type: 'AI_PROVIDER',
      };
      const identity = service.registerExternalNode(external, 'ai');
      onboarding.onboardNode(identity, 'HIGH', 1000);

      assert.strictEqual(nodeRegistry.isActive('ai-openai-gpt'), true);
      const reg = nodeRegistry.getRegistration('ai-openai-gpt');
      assert.ok(reg);
      assert.strictEqual(reg!.identity.node_id, 'ai-openai-gpt');
      assert.strictEqual(reg!.status, 'ACTIVE');
    });
  });

  describe('isValidBridgeType', () => {
    it('returns true for valid bridge types', () => {
      assert.strictEqual(isValidBridgeType('AI_PROVIDER'), true);
      assert.strictEqual(isValidBridgeType('ENTERPRISE_API'), true);
      assert.strictEqual(isValidBridgeType('IOT_NETWORK'), true);
      assert.strictEqual(isValidBridgeType('EXTERNAL_PROTOCOL'), true);
    });

    it('returns false for invalid bridge types', () => {
      assert.strictEqual(isValidBridgeType('UNKNOWN'), false);
      assert.strictEqual(isValidBridgeType(''), false);
    });
  });
});
