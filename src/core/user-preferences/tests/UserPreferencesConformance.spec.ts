/**
 * User Preferences - Conformance Fase 6
 */
import { describe, it, expect } from 'vitest';
import type { UserPreference } from '../UserPreference';
import type { UserPreferenceValue } from '../UserPreferenceValue';
import { InMemoryUserPreferenceStore } from '../store/InMemoryUserPreferenceStore';
import type { UserPreferenceRule } from '../rules/UserPreferenceRule';
import type { UserPreferenceContext } from '../rules/UserPreferenceContext';
import type { FeaturePolicyDecision } from '../../policies/FeaturePolicyDecision';

const NOW = 1704110400000;

function pref(id: string, value: UserPreferenceValue, updatedAt: number = NOW): UserPreference {
  return Object.freeze({ id, value, updatedAt });
}

describe('User Preferences Conformance', () => {
  it('store get returns null for missing id', () => {
    const store = new InMemoryUserPreferenceStore();
    expect(store.get('missing')).toBeNull();
  });
  it('store get returns preference for existing id', () => {
    const p = pref('f1', { type: 'BOOLEAN', value: true });
    const store = new InMemoryUserPreferenceStore([p]);
    expect(store.get('f1')).toEqual(p);
  });
  it('UserPreference has no forbidden keys', () => {
    const p = pref('x', { type: 'BOOLEAN', value: false });
    const keys = Object.keys(p);
    expect(keys).not.toContain('confidence');
    expect(keys).not.toContain('inferred');
  });
  it('UserPreferenceRule evaluate returns FeaturePolicyDecision', () => {
    const rule: UserPreferenceRule = { id: 'r1', evaluate: () => ({ status: 'ALLOWED' }) };
    const ctx: UserPreferenceContext = { featureId: 'f1', productMode: 'DEFAULT' };
    expect(rule.evaluate(null, ctx).status).toBe('ALLOWED');
  });
});
