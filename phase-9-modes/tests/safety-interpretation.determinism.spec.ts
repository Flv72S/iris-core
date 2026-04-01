import { describe, it, expect } from 'vitest';
import { interpretSafetyVerdict } from '../safety-interpretation/safety-interpretation.resolver';
import { hashSafetyInterpretation } from '../safety-interpretation/safety-interpretation.hash';

function verdict(v: 'SAFE' | 'CAUTION' | 'UNSAFE' | 'BLOCKED') {
  return Object.freeze({ verdict: v, violatedRules: [], certifiedAt: '2025-01-01T00:00:00Z' });
}

describe('Safety interpretation determinism', () => {
  it('same verdict + mode produces same output', () => {
    const a = interpretSafetyVerdict(verdict('CAUTION'), 'FOCUS');
    const b = interpretSafetyVerdict(verdict('CAUTION'), 'FOCUS');
    expect(a).toEqual(b);
  });

  it('hash is stable', () => {
    const i = interpretSafetyVerdict(verdict('SAFE'), 'DEFAULT');
    expect(hashSafetyInterpretation(i)).toBe(hashSafetyInterpretation(i));
  });

  it('original verdict is not mutated', () => {
    const v = verdict('UNSAFE');
    const before = JSON.stringify(v);
    interpretSafetyVerdict(v, 'WELLBEING');
    expect(JSON.stringify(v)).toBe(before);
  });

  it('output is immutable', () => {
    const i = interpretSafetyVerdict(verdict('SAFE'), 'DEFAULT');
    expect(Object.isFrozen(i)).toBe(true);
  });
});
