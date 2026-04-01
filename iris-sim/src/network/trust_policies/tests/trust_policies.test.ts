/**
 * Phase 13XX-J — Cross-Network Trust Policies. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PolicyRegistry,
  PolicyValidator,
  PolicyEvaluator,
  PolicyService,
  isValidPolicyType,
  PARAM_CROSS_NETWORK_WEIGHT,
  PARAM_INTERACTION_ALLOWED,
  type TrustPolicy,
} from '../index.js';

function policy(overrides: Partial<TrustPolicy> & { policy_id: string; policy_type: TrustPolicy['policy_type']; source_domain: string; target_domain: string }): TrustPolicy {
  return {
    policy_id: overrides.policy_id,
    policy_type: overrides.policy_type,
    source_domain: overrides.source_domain,
    target_domain: overrides.target_domain,
    parameters: overrides.parameters ?? {},
  };
}

describe('Cross-Network Trust Policies (Phase 13XX-J)', () => {
  describe('policy registration', () => {
    it('registers policy and returns it via getPolicy', () => {
      const registry = new PolicyRegistry();
      const p = policy({
        policy_id: 'p1',
        policy_type: 'CROSS_NETWORK_WEIGHT',
        source_domain: 'AI_PROVIDER',
        target_domain: 'IRIS_INTERNAL',
        parameters: { cross_network_weight: 0.5 },
      });
      registry.registerPolicy(p);
      assert.strictEqual(registry.getPolicy('p1')?.policy_id, 'p1');
      assert.strictEqual(registry.getPolicy('p1')?.policy_type, 'CROSS_NETWORK_WEIGHT');
    });

    it('getPolicy returns null for unknown policy_id', () => {
      const registry = new PolicyRegistry();
      assert.strictEqual(registry.getPolicy('missing'), null);
    });

    it('listPolicies returns all registered policies', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(policy({ policy_id: 'a', policy_type: 'CROSS_NETWORK_WEIGHT', source_domain: 'X', target_domain: 'Y' }));
      registry.registerPolicy(policy({ policy_id: 'b', policy_type: 'DOMAIN_INTERACTION_RULE', source_domain: 'X', target_domain: 'Y' }));
      const list = registry.listPolicies();
      assert.strictEqual(list.length, 2);
    });

    it('getPoliciesForDomains returns only matching policies', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(policy({ policy_id: 'p1', policy_type: 'CROSS_NETWORK_WEIGHT', source_domain: 'AI_PROVIDER', target_domain: 'IRIS_INTERNAL' }));
      registry.registerPolicy(policy({ policy_id: 'p2', policy_type: 'CROSS_NETWORK_WEIGHT', source_domain: 'IRIS_INTERNAL', target_domain: 'AI_PROVIDER' }));
      const out = registry.getPoliciesForDomains('AI_PROVIDER', 'IRIS_INTERNAL');
      assert.strictEqual(out.length, 1);
      assert.strictEqual(out[0].policy_id, 'p1');
    });
  });

  describe('policy validation', () => {
    it('accepts valid policy', () => {
      const validator = new PolicyValidator();
      const p = policy({ policy_id: 'v1', policy_type: 'CROSS_NETWORK_WEIGHT', source_domain: 'A', target_domain: 'B', parameters: { x: 0.5 } });
      assert.strictEqual(validator.validatePolicy(p), true);
    });

    it('rejects empty policy_id', () => {
      const validator = new PolicyValidator();
      const p = policy({ policy_id: '', policy_type: 'CROSS_NETWORK_WEIGHT', source_domain: 'A', target_domain: 'B' });
      assert.strictEqual(validator.validatePolicy(p), false);
    });

    it('rejects invalid policy_type', () => {
      const validator = new PolicyValidator();
      const p = policy({ policy_id: 'v1', policy_type: 'INVALID_TYPE' as TrustPolicy['policy_type'], source_domain: 'A', target_domain: 'B' });
      assert.strictEqual(validator.validatePolicy(p), false);
    });

    it('rejects empty source_domain or target_domain', () => {
      const validator = new PolicyValidator();
      assert.strictEqual(validator.validatePolicy(policy({ policy_id: 'v1', policy_type: 'CROSS_NETWORK_WEIGHT', source_domain: '', target_domain: 'B' })), false);
      assert.strictEqual(validator.validatePolicy(policy({ policy_id: 'v1', policy_type: 'CROSS_NETWORK_WEIGHT', source_domain: 'A', target_domain: '' })), false);
    });

    it('rejects non-object parameters', () => {
      const validator = new PolicyValidator();
      const p = policy({ policy_id: 'v1', policy_type: 'CROSS_NETWORK_WEIGHT', source_domain: 'A', target_domain: 'B', parameters: 42 as unknown as Record<string, unknown> });
      assert.strictEqual(validator.validatePolicy(p), false);
    });
  });

  describe('policy evaluation', () => {
    it('evaluatePropagation applies cross_network_weight', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(
        policy({
          policy_id: 'w1',
          policy_type: 'CROSS_NETWORK_WEIGHT',
          source_domain: 'AI_PROVIDER',
          target_domain: 'IRIS_INTERNAL',
          parameters: { [PARAM_CROSS_NETWORK_WEIGHT]: 0.5 },
        })
      );
      const evaluator = new PolicyEvaluator(registry);
      const out = evaluator.evaluatePropagation('AI_PROVIDER', 'IRIS_INTERNAL', 0.8);
      assert.strictEqual(out, 0.4);
    });

    it('evaluatePropagation clamps result to [0, 1]', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(
        policy({
          policy_id: 'w1',
          policy_type: 'CROSS_NETWORK_WEIGHT',
          source_domain: 'A',
          target_domain: 'B',
          parameters: { [PARAM_CROSS_NETWORK_WEIGHT]: 2 },
        })
      );
      const evaluator = new PolicyEvaluator(registry);
      const out = evaluator.evaluatePropagation('A', 'B', 0.8);
      assert.strictEqual(out, 1);
    });

    it('isInteractionAllowed returns true when no blocking rule', () => {
      const registry = new PolicyRegistry();
      const evaluator = new PolicyEvaluator(registry);
      assert.strictEqual(evaluator.isInteractionAllowed('A', 'B'), true);
    });

    it('isInteractionAllowed returns false when DOMAIN_INTERACTION_RULE has interaction_allowed false', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(
        policy({
          policy_id: 'r1',
          policy_type: 'DOMAIN_INTERACTION_RULE',
          source_domain: 'EXTERNAL_PROTOCOL',
          target_domain: 'IRIS_INTERNAL',
          parameters: { [PARAM_INTERACTION_ALLOWED]: false },
        })
      );
      const evaluator = new PolicyEvaluator(registry);
      assert.strictEqual(evaluator.isInteractionAllowed('EXTERNAL_PROTOCOL', 'IRIS_INTERNAL'), false);
    });

    it('evaluatePropagation returns 0 when interaction not allowed', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(
        policy({
          policy_id: 'r1',
          policy_type: 'DOMAIN_INTERACTION_RULE',
          source_domain: 'X',
          target_domain: 'Y',
          parameters: { [PARAM_INTERACTION_ALLOWED]: false },
        })
      );
      const evaluator = new PolicyEvaluator(registry);
      const out = evaluator.evaluatePropagation('X', 'Y', 0.9);
      assert.strictEqual(out, 0);
    });
  });

  describe('interaction blocking', () => {
    it('validateInteraction blocks when policy forbids', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(
        policy({
          policy_id: 'block',
          policy_type: 'DOMAIN_INTERACTION_RULE',
          source_domain: 'AI_PROVIDER',
          target_domain: 'IRIS_INTERNAL',
          parameters: { [PARAM_INTERACTION_ALLOWED]: false },
        })
      );
      const service = new PolicyService(registry, new PolicyEvaluator(registry));
      assert.strictEqual(service.validateInteraction('AI_PROVIDER', 'IRIS_INTERNAL'), false);
    });

    it('validateInteraction allows when no rule or allowed true', () => {
      const registry = new PolicyRegistry();
      const service = new PolicyService(registry, new PolicyEvaluator(registry));
      assert.strictEqual(service.validateInteraction('IRIS_INTERNAL', 'AI_PROVIDER'), true);
    });
  });

  describe('cross-network weighting', () => {
    it('evaluateTrustTransfer reduces external trust by weight', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(
        policy({
          policy_id: 'ext-weight',
          policy_type: 'CROSS_NETWORK_WEIGHT',
          source_domain: 'AI_PROVIDER',
          target_domain: 'IRIS_INTERNAL',
          parameters: { [PARAM_CROSS_NETWORK_WEIGHT]: 0.5 },
        })
      );
      const service = new PolicyService(registry, new PolicyEvaluator(registry));
      const out = service.evaluateTrustTransfer('AI_PROVIDER', 'IRIS_INTERNAL', 1);
      assert.strictEqual(out, 0.5);
    });

    it('multiple CROSS_NETWORK_WEIGHT policies multiply', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(
        policy({
          policy_id: 'w1',
          policy_type: 'CROSS_NETWORK_WEIGHT',
          source_domain: 'A',
          target_domain: 'B',
          parameters: { [PARAM_CROSS_NETWORK_WEIGHT]: 0.5 },
        })
      );
      registry.registerPolicy(
        policy({
          policy_id: 'w2',
          policy_type: 'CROSS_NETWORK_WEIGHT',
          source_domain: 'A',
          target_domain: 'B',
          parameters: { [PARAM_CROSS_NETWORK_WEIGHT]: 0.4 },
        })
      );
      const service = new PolicyService(registry, new PolicyEvaluator(registry));
      const out = service.evaluateTrustTransfer('A', 'B', 1);
      assert.strictEqual(out, 0.2);
    });
  });

  describe('deterministic evaluation', () => {
    it('same inputs produce same evaluatePropagation result', () => {
      const registry = new PolicyRegistry();
      registry.registerPolicy(
        policy({
          policy_id: 'd1',
          policy_type: 'CROSS_NETWORK_WEIGHT',
          source_domain: 'S',
          target_domain: 'T',
          parameters: { [PARAM_CROSS_NETWORK_WEIGHT]: 0.7 },
        })
      );
      const evaluator = new PolicyEvaluator(registry);
      const a = evaluator.evaluatePropagation('S', 'T', 0.6);
      const b = evaluator.evaluatePropagation('S', 'T', 0.6);
      assert.strictEqual(a, b);
      assert.strictEqual(a, 0.42);
    });

    it('same inputs produce same isInteractionAllowed result', () => {
      const registry = new PolicyRegistry();
      const evaluator = new PolicyEvaluator(registry);
      assert.strictEqual(evaluator.isInteractionAllowed('X', 'Y'), evaluator.isInteractionAllowed('X', 'Y'));
    });
  });

  describe('isValidPolicyType', () => {
    it('returns true for valid policy types', () => {
      assert.strictEqual(isValidPolicyType('TRUST_PROPAGATION_LIMIT'), true);
      assert.strictEqual(isValidPolicyType('CROSS_NETWORK_WEIGHT'), true);
      assert.strictEqual(isValidPolicyType('DOMAIN_INTERACTION_RULE'), true);
    });

    it('returns false for invalid policy types', () => {
      assert.strictEqual(isValidPolicyType('UNKNOWN'), false);
    });
  });
});
