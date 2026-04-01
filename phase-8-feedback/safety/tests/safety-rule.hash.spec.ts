/**
 * Phase 8.2.1 — SafetyRule hash determinism tests
 */

import { describe, it, expect } from 'vitest';
import { computeSafetyRuleHash } from '../rules/safety-rule.hash';
import type { SafetyRule } from '../rules/safety-rule.types';

const baseRule: Omit<SafetyRule, 'deterministicHash'> = {
  id: 'TEST_RULE',
  version: '1.0.0',
  description: 'Test rule',
  severity: 'WARNING',
  scope: 'SINGLE_OUTCOME',
  parameters: Object.freeze({ key: 'value' }),
};

describe('SafetyRule hash determinism', () => {
  it('same input produces same hash', () => {
    const h1 = computeSafetyRuleHash(baseRule);
    const h2 = computeSafetyRuleHash(baseRule);
    expect(h1).toBe(h2);
  });

  it('hash stable across multiple runs', () => {
    const hashes: string[] = [];
    for (let i = 0; i < 5; i++) {
      hashes.push(computeSafetyRuleHash(baseRule));
    }
    expect(hashes.every((h) => h === hashes[0])).toBe(true);
  });

  it('change in parameters yields different hash', () => {
    const h1 = computeSafetyRuleHash(baseRule);
    const h2 = computeSafetyRuleHash({
      ...baseRule,
      parameters: Object.freeze({ key: 'other' }),
    });
    expect(h1).not.toBe(h2);
  });

  it('change in severity yields different hash', () => {
    const h1 = computeSafetyRuleHash(baseRule);
    const h2 = computeSafetyRuleHash({
      ...baseRule,
      severity: 'CRITICAL',
    });
    expect(h1).not.toBe(h2);
  });

  it('change in id yields different hash', () => {
    const h1 = computeSafetyRuleHash(baseRule);
    const h2 = computeSafetyRuleHash({ ...baseRule, id: 'OTHER_RULE' });
    expect(h1).not.toBe(h2);
  });

  it('change in description yields different hash', () => {
    const h1 = computeSafetyRuleHash(baseRule);
    const h2 = computeSafetyRuleHash({ ...baseRule, description: 'Other' });
    expect(h1).not.toBe(h2);
  });
});
