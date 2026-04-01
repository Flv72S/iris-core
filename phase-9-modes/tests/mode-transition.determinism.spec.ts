/**
 * Phase 9.4 — Mode transition determinism tests
 */

import { describe, it, expect } from 'vitest';
import { resolveModeTransition } from '../mode-transition/mode-transition.resolver';
import { hashModeTransitionEvent } from '../mode-transition/mode-transition.hash';

const INITIATED = '2025-01-01T12:00:00.000Z';

describe('Mode transition determinism', () => {
  it('same request produces same event', () => {
    const a = resolveModeTransition('DEFAULT', 'FOCUS', INITIATED, 'reason');
    const b = resolveModeTransition('DEFAULT', 'FOCUS', INITIATED, 'reason');
    expect(a.from).toBe(b.from);
    expect(a.to).toBe(b.to);
    expect(a.effectiveAt).toBe(b.effectiveAt);
    expect(a.stage).toBe(b.stage);
  });

  it('hash is stable', () => {
    const ev = resolveModeTransition('FOCUS', 'DEFAULT', INITIATED, 'r');
    expect(hashModeTransitionEvent(ev)).toBe(hashModeTransitionEvent(ev));
  });

  it('no runtime dependency for same inputs', () => {
    const ev1 = resolveModeTransition('DEFAULT', 'WELLBEING', INITIATED, 'rationale');
    const ev2 = resolveModeTransition('DEFAULT', 'WELLBEING', INITIATED, 'rationale');
    expect(ev1.effectiveAt).toBe(ev2.effectiveAt);
    expect(hashModeTransitionEvent(ev1)).toBe(hashModeTransitionEvent(ev2));
  });
});
