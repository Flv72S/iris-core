import { describe, it, expect } from 'vitest';
import { resolveModeTransition, ModeTransitionNotAllowedError } from '../mode-transition/mode-transition.resolver';
import { resolveTransitionStage } from '../mode-transition/mode-transition.timeline';

const INITIATED = '2025-01-01T12:00:00.000Z';

describe('Mode transition', () => {
  it('forbidden transition throws', () => {
    expect(() => resolveModeTransition('WELLBEING', 'FOCUS', INITIATED, 'test')).toThrow(ModeTransitionNotAllowedError);
  });

  it('minimum durations in effectiveAt', () => {
    const e = resolveModeTransition('DEFAULT', 'FOCUS', INITIATED, 'r');
    expect(new Date(e.effectiveAt).getTime() - new Date(INITIATED).getTime()).toBe(30000);
  });

  it('rationale required', () => {
    expect(() => resolveModeTransition('DEFAULT', 'FOCUS', INITIATED, '')).toThrow();
  });

  it('WELLBEING to FOCUS blocked', () => {
    expect(() => resolveModeTransition('WELLBEING', 'FOCUS', INITIATED, 'x')).toThrow(ModeTransitionNotAllowedError);
  });

  it('stage by time', () => {
    const ev = resolveModeTransition('DEFAULT', 'FOCUS', INITIATED, 'r');
    expect(resolveTransitionStage(ev, INITIATED)).toBe('IN_PROGRESS');
    expect(resolveTransitionStage(ev, ev.effectiveAt)).toBe('EFFECTIVE');
  });
});
