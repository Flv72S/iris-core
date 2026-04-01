/**
 * Phase 8.3 — Escalation mapping tests
 */

import { describe, it, expect } from 'vitest';
import { createBoundaryEscalationEvent } from '../escalation/boundary-escalation.bridge';
import type { SafetyChecklistVerdict } from '../../safety/checklist/safety-checklist.types';

function verdict(status: SafetyChecklistVerdict['status'], violatedRules: string[] = []): SafetyChecklistVerdict {
  return Object.freeze({
    status,
    violatedRules: Object.freeze([...violatedRules]) as readonly string[],
    hasCriticalFailure: status === 'UNSAFE',
    explanation: status === 'SAFE' ? 'All rules passed.' : `Violations: ${violatedRules.join(', ')}.`,
  });
}

describe('Boundary escalation bridge', () => {
  it('SAFE → NONE', () => {
    const event = createBoundaryEscalationEvent(verdict('SAFE'));
    expect(event.level).toBe('NONE');
    expect(event.checklistStatus).toBe('SAFE');
  });

  it('WARNING → OBSERVE', () => {
    const event = createBoundaryEscalationEvent(verdict('WARNING', ['R1']));
    expect(event.level).toBe('OBSERVE');
    expect(event.checklistStatus).toBe('WARNING');
  });

  it('UNSAFE → BLOCK_RECOMMENDED', () => {
    const event = createBoundaryEscalationEvent(verdict('UNSAFE', ['R1']));
    expect(event.level).toBe('BLOCK_RECOMMENDED');
    expect(event.checklistStatus).toBe('UNSAFE');
  });

  it('hash is stable for same verdict', () => {
    const v = verdict('WARNING', ['A']);
    const a = createBoundaryEscalationEvent(v);
    const b = createBoundaryEscalationEvent(v);
    expect(a.deterministicHash).toBe(b.deterministicHash);
  });

  it('explanation is present', () => {
    const event = createBoundaryEscalationEvent(verdict('SAFE'));
    expect(event.explanation.length).toBeGreaterThan(0);
    const event2 = createBoundaryEscalationEvent(verdict('UNSAFE', ['X']));
    expect(event2.explanation.length).toBeGreaterThan(0);
  });

  it('violatedRules is copied and immutable', () => {
    const v = verdict('WARNING', ['R1', 'R2']);
    const event = createBoundaryEscalationEvent(v);
    expect(event.violatedRules).toEqual(['R1', 'R2']);
    expect(Object.isFrozen(event.violatedRules)).toBe(true);
  });
});
