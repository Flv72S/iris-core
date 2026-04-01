/**
 * Phase 7.V — Test Infrastructure Construction
 *
 * Verifica che il banco prova sia completo: harness, replay, determinism.
 * Non è la Phase 7 Certification; è la validazione dell'infrastruttura.
 */

import { describe, it, expect } from 'vitest';
import { runAllPhase7Tests } from './runners/run-all-phase7-tests';
import { runDeterminismSuite } from './runners/run-determinism-suite';
import { runExecutionHarness } from './harness/execution-harness';
import { runReplay } from './harness/replay-engine';
import { RESOLVED_ALLOWED } from './fixtures/resolution-states';
import { FOCUS_NOTIFICATION } from './fixtures/action-intents';
import { GLOBAL_OFF } from './fixtures/kill-switch-scenarios';

describe('Phase 7.V — Test Infrastructure', () => {
  it('run-all-phase7-tests: tutti i run completano senza throw', () => {
    const { passed, failed, results } = runAllPhase7Tests();
    expect(results.length).toBeGreaterThan(0);
    expect(passed + failed).toBe(results.length);
  });

  it('run-determinism-suite: nessuna divergenza rilevata', () => {
    const report = runDeterminismSuite(3);
    expect(report.total).toBeGreaterThan(0);
    expect(report.diverged).toBe(0);
    expect(report.identical).toBe(report.total);
  });

  it('execution harness: con resolution ALLOWED produce result e audit snapshot', () => {
    const out = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: new Date('2025-01-15T10:00:00.000Z').getTime(),
    });
    expect(out.result).toBeDefined();
    expect(out.auditSnapshot).toBeDefined();
    expect(out.intent.intentId).toBe(FOCUS_NOTIFICATION.id);
  });

  it('replay engine: stesso input produce identical=true', () => {
    const now = new Date('2025-01-15T10:00:00.000Z').getTime();
    const originalOutput = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: now,
    });
    const replayResult = runReplay({
      originalOutput,
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: now,
    });
    expect(replayResult.identical).toBe(true);
  });

  it('kill-switch global OFF: execution BLOCKED', () => {
    const out = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      killSwitch: GLOBAL_OFF,
      nowMs: new Date('2025-01-15T10:00:00.000Z').getTime(),
    });
    expect(out.result.status).toBe('BLOCKED');
  });
});
