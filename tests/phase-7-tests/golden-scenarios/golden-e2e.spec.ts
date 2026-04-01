/**
 * 7T.7 — Golden Scenario End-to-End
 *
 * Scenari congelati: input snapshot, audit atteso, hash certificato.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runExecutionHarness } from '../../phase-7/harness/execution-harness';
import { RESOLVED_ALLOWED, RESOLVED_BLOCKED } from '../../phase-7/fixtures/resolution-states';
import { FOCUS_NOTIFICATION } from '../../phase-7/fixtures/action-intents';
import { createSharedRegistry, triggerGlobalStop } from '@/core/execution/killswitch-propagation';
import { computeAuditHash } from '../../phase-7/hardening/determinism/audit-hash';
import { freezeClock, frozenNowMs, resetFrozenClock } from '../../phase-7/hardening/time/frozen-clock';

const FROZEN_SEED = '2025-01-15T10:00:00.000Z';

describe('7T.7 — Golden Scenarios', () => {
  beforeEach(() => {
    resetFrozenClock();
    freezeClock(FROZEN_SEED);
  });

  afterEach(() => {
    resetFrozenClock();
  });

  it('golden: ALLOWED + focus notification → EXECUTED, stable hash', () => {
    const now = frozenNowMs(FROZEN_SEED);
    const out = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: now,
    });
    expect(out.result.status).toBe('EXECUTED');
    const h = computeAuditHash(out.auditSnapshot);
    expect(h).toBeDefined();
    const out2 = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: now,
    });
    expect(computeAuditHash(out2.auditSnapshot)).toBe(h);
  });

  it('golden: BLOCKED resolution → no execution', () => {
    const now = frozenNowMs(FROZEN_SEED);
    const out = runExecutionHarness({
      resolution: RESOLVED_BLOCKED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: now,
    });
    expect(out.result.status).toBe('BLOCKED');
    const executed = out.auditSnapshot.filter((e) => e.result.status === 'EXECUTED');
    expect(executed.length).toBe(0);
  });

  it('golden: kill-switch mid-batch → second intent BLOCKED', () => {
    const registry = createSharedRegistry();
    const now = frozenNowMs(FROZEN_SEED);
    const out1 = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      registry,
      nowMs: now,
    });
    triggerGlobalStop(registry);
    const out2 = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      registry,
      nowMs: now,
    });
    expect(out1.result.status).toBe('EXECUTED');
    expect(out2.result.status).toBe('BLOCKED');
  });
});
