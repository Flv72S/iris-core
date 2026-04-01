import { describe, it, expect } from 'vitest';
import { interpretSafetyVerdict } from '../safety-interpretation/safety-interpretation.resolver';

function verdict(v: 'SAFE' | 'CAUTION' | 'UNSAFE' | 'BLOCKED') {
  return Object.freeze({ verdict: v, violatedRules: [], certifiedAt: '2025-01-01T00:00:00Z' });
}

describe('Safety interpretation', () => {
  it('BLOCKED always yields BLOCK_RECOMMENDED', () => {
    for (const mode of ['DEFAULT', 'FOCUS', 'WELLBEING'] as const) {
      const i = interpretSafetyVerdict(verdict('BLOCKED'), mode);
      expect(i.recommendedAction).toBe('BLOCK_RECOMMENDED');
    }
  });

  it('WELLBEING is more restrictive than DEFAULT', () => {
    const wellCaution = interpretSafetyVerdict(verdict('CAUTION'), 'WELLBEING');
    const defCaution = interpretSafetyVerdict(verdict('CAUTION'), 'DEFAULT');
    expect(wellCaution.recommendedAction).toBe('BLOCK_RECOMMENDED');
    expect(defCaution.recommendedAction).toBe('PROCEED_WITH_LIMITS');
  });

  it('FOCUS is more severe on CAUTION', () => {
    const focus = interpretSafetyVerdict(verdict('CAUTION'), 'FOCUS');
    expect(focus.interpretedRiskLevel).toBe('HIGH');
  });

  it('SAFE never becomes UNSAFE', () => {
    for (const mode of ['DEFAULT', 'FOCUS', 'WELLBEING'] as const) {
      const i = interpretSafetyVerdict(verdict('SAFE'), mode);
      expect(i.baseVerdict).toBe('SAFE');
    }
  });

  it('explanation is always present', () => {
    const i = interpretSafetyVerdict(verdict('SAFE'), 'DEFAULT');
    expect(i.explanation.length).toBeGreaterThan(0);
  });
});
