import { describe, it, expect } from 'vitest';
import { SAFETY_RULE_CATALOG } from '../rules/safety-rule.catalog';
import type { SafetyRuleSeverity, SafetyRuleScope } from '../rules/safety-rule.types';

const SEVERITIES: SafetyRuleSeverity[] = ['INFO', 'WARNING', 'CRITICAL'];
const SCOPES: SafetyRuleScope[] = ['SINGLE_OUTCOME', 'OUTCOME_SEQUENCE'];

describe('SafetyRule model and catalog', () => {
  it('every rule has id, version, severity, scope', () => {
    for (const rule of SAFETY_RULE_CATALOG) {
      expect(typeof rule.id).toBe('string');
      expect(rule.id.length).toBeGreaterThan(0);
      expect(typeof rule.version).toBe('string');
      expect(rule.version.length).toBeGreaterThan(0);
      expect(SEVERITIES).toContain(rule.severity);
      expect(SCOPES).toContain(rule.scope);
    }
  });

  it('no rule has mutable fields exposed', () => {
    for (const rule of SAFETY_RULE_CATALOG) {
      expect(Object.isFrozen(rule)).toBe(true);
      expect(rule).toHaveProperty('description');
      expect(rule).toHaveProperty('parameters');
      expect(rule).toHaveProperty('deterministicHash');
      expect(Object.isFrozen(rule.parameters)).toBe(true);
    }
  });

  it('catalog is readonly', () => {
    expect(Object.isFrozen(SAFETY_RULE_CATALOG)).toBe(true);
    expect(Array.isArray(SAFETY_RULE_CATALOG)).toBe(true);
  });

  it('parameters are JSON-serializable', () => {
    for (const rule of SAFETY_RULE_CATALOG) {
      expect(() => JSON.stringify(rule.parameters)).not.toThrow();
      const parsed = JSON.parse(JSON.stringify(rule.parameters));
      expect(parsed).toEqual(rule.parameters);
    }
  });

  it('no duplicate id+version', () => {
    const keys = new Set<string>();
    for (const rule of SAFETY_RULE_CATALOG) {
      const key = `${rule.id}@${rule.version}`;
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  it('catalog contains expected base rules', () => {
    const ids = SAFETY_RULE_CATALOG.map((r) => r.id);
    expect(ids).toContain('NO_CRITICAL_FAILURE');
    expect(ids).toContain('NO_FAILURE_CASCADE');
  });

  it('rules are purely declarative (parameters data-only)', () => {
    for (const rule of SAFETY_RULE_CATALOG) {
      for (const value of Object.values(rule.parameters)) {
        const t = typeof value;
        expect(['string', 'number', 'boolean', 'object'].includes(t) || value === null).toBe(true);
      }
    }
  });
});
