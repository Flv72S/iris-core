/**
 * 7T.1 — Deterministic Runtime Tests
 *
 * Stesso ResolutionContext/Result/Plan → stessi ActionIntent, ordine, hash audit, stato finale.
 * Failure ⇒ determinismo rotto.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runExecutionHarness } from '../../phase-7/harness/execution-harness';
import { runDeterminismCheck } from '../../phase-7/harness/determinism-checker';
import { RESOLVED_ALLOWED } from '../../phase-7/fixtures/resolution-states';
import { FOCUS_NOTIFICATION, ALL_ACTION_INTENT_FIXTURES } from '../../phase-7/fixtures/action-intents';
import { computeAuditHash } from '../../phase-7/hardening/determinism/audit-hash';
import { compareAuditSnapshots } from '../../phase-7/hardening/determinism/deep-structural-compare';
import { freezeClock, frozenNowMs, resetFrozenClock } from '../../phase-7/hardening/time/frozen-clock';

const FROZEN_SEED = '2025-01-15T10:00:00.000Z';

describe('7T.1 — Deterministic Runtime', () => {
  beforeEach(() => {
    resetFrozenClock();
    freezeClock(FROZEN_SEED);
  });

  afterEach(() => {
    resetFrozenClock();
  });

  it('same input produces same execution result', () => {
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
    expect(out1.result.status).toBe(out2.result.status);
    if (out1.result.status === 'EXECUTED' && out2.result.status === 'EXECUTED') {
      expect(out1.result.executedAt).toBe(out2.result.executedAt);
    }
  });

  it('same input produces same audit snapshot (byte-level)', () => {
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
    const diff = compareAuditSnapshots(out1.auditSnapshot, out2.auditSnapshot);
    expect(diff).toBeNull();
  });

  it('same input produces same audit hash', () => {
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
    const h1 = computeAuditHash(out1.auditSnapshot);
    const h2 = computeAuditHash(out2.auditSnapshot);
    expect(h1).toBe(h2);
  });

  it('idempotency: consecutive runs with same intent produce deterministic outcome', () => {
    const now = frozenNowMs(FROZEN_SEED);
    const report = runDeterminismCheck(
      {
        resolution: RESOLVED_ALLOWED,
        intentFixture: FOCUS_NOTIFICATION,
        nowMs: now,
      },
      3
    );
    expect(report.identical).toBe(true);
    expect(report.divergence).toBeUndefined();
  });

  it('multiple intents same resolution: deterministic order and hashes', () => {
    const now = frozenNowMs(FROZEN_SEED);
    const hashes: string[] = [];
    for (const fixture of ALL_ACTION_INTENT_FIXTURES.slice(0, 2)) {
      const out = runExecutionHarness({
        resolution: RESOLVED_ALLOWED,
        intentFixture: fixture,
        nowMs: now,
      });
      hashes.push(computeAuditHash(out.auditSnapshot));
    }
    const out2a = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: ALL_ACTION_INTENT_FIXTURES[0]!,
      nowMs: now,
    });
    const out2b = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: ALL_ACTION_INTENT_FIXTURES[0]!,
      nowMs: now,
    });
    expect(computeAuditHash(out2a.auditSnapshot)).toBe(computeAuditHash(out2b.auditSnapshot));
  });
});
