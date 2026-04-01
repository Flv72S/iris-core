/**
 * 7T.6 — Forensic Replay Certification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runExecutionHarness } from '../../phase-7/harness/execution-harness';
import { runReplay } from '../../phase-7/harness/replay-engine';
import { RESOLVED_ALLOWED } from '../../phase-7/fixtures/resolution-states';
import { FOCUS_NOTIFICATION } from '../../phase-7/fixtures/action-intents';
import { computeAuditHash } from '../../phase-7/hardening/determinism/audit-hash';
import { freezeClock, frozenNowMs, resetFrozenClock } from '../../phase-7/hardening/time/frozen-clock';

const FROZEN_SEED = '2025-01-15T10:00:00.000Z';

describe('7T.6 — Forensic Replay Certification', () => {
  beforeEach(() => {
    resetFrozenClock();
    freezeClock(FROZEN_SEED);
  });
  afterEach(() => resetFrozenClock());

  it('replay produces identical result and audit', () => {
    const now = frozenNowMs(FROZEN_SEED);
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

  it('replay produces same audit hash', () => {
    const now = frozenNowMs(FROZEN_SEED);
    const out1 = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: now,
    });
    const out2 = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: now,
    });
    expect(computeAuditHash(out1.auditSnapshot)).toBe(computeAuditHash(out2.auditSnapshot));
  });
});
