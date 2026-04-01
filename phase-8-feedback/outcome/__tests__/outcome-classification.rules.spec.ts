/**
 * Phase 8.1.2 — Rules correctness tests
 *
 * Mapping completo: SUCCESS→POSITIVE, FAILED→NEGATIVE, REVERTED→RECOVERED, IGNORED→NEUTRAL.
 * Severity e recoverable corretti; nessun caso non coperto.
 */

import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../model/outcome.factory';
import { classifyOutcome } from '../classification/outcome-classification.engine';
import type { OutcomeStatus } from '../model/outcome.types';

const base = {
  id: 'out-1',
  actionIntentId: 'intent-1',
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

describe('Outcome classification rules', () => {
  it('SUCCESS → POSITIVE, severity 0, not recoverable', () => {
    const outcome = createActionOutcome({ ...base, status: 'SUCCESS' });
    const c = classifyOutcome(outcome);
    expect(c.semanticClass).toBe('POSITIVE');
    expect(c.severity).toBe(0);
    expect(c.recoverable).toBe(false);
  });

  it('FAILED → NEGATIVE, severity 1, not recoverable', () => {
    const outcome = createActionOutcome({ ...base, status: 'FAILED' });
    const c = classifyOutcome(outcome);
    expect(c.semanticClass).toBe('NEGATIVE');
    expect(c.severity).toBe(1);
    expect(c.recoverable).toBe(false);
  });

  it('REVERTED → RECOVERED, severity 0.5, recoverable', () => {
    const outcome = createActionOutcome({ ...base, status: 'REVERTED' });
    const c = classifyOutcome(outcome);
    expect(c.semanticClass).toBe('RECOVERED');
    expect(c.severity).toBe(0.5);
    expect(c.recoverable).toBe(true);
  });

  it('IGNORED → NEUTRAL, severity 0, recoverable', () => {
    const outcome = createActionOutcome({ ...base, status: 'IGNORED' });
    const c = classifyOutcome(outcome);
    expect(c.semanticClass).toBe('NEUTRAL');
    expect(c.severity).toBe(0);
    expect(c.recoverable).toBe(true);
  });

  it('severity always in [0, 1]', () => {
    const statuses: OutcomeStatus[] = ['SUCCESS', 'FAILED', 'REVERTED', 'IGNORED'];
    for (const status of statuses) {
      const outcome = createActionOutcome({ ...base, status });
      const c = classifyOutcome(outcome);
      expect(c.severity).toBeGreaterThanOrEqual(0);
      expect(c.severity).toBeLessThanOrEqual(1);
    }
  });

  it('all statuses covered with valid semantic class', () => {
    const statuses: OutcomeStatus[] = ['SUCCESS', 'FAILED', 'REVERTED', 'IGNORED'];
    const classes = new Set(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'RECOVERED']);
    for (const status of statuses) {
      const outcome = createActionOutcome({ ...base, status });
      const c = classifyOutcome(outcome);
      expect(classes.has(c.semanticClass)).toBe(true);
      expect(c.outcomeId).toBe(outcome.id);
    }
  });
});
