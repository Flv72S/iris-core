/**
 * 7T.5 — Execution Audit Integrity Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runExecutionHarness } from '../../phase-7/harness/execution-harness';
import { _resetAuditForTest } from '@/core/execution/audit/ExecutionAuditLog';
import { computeAuditHash } from '../../phase-7/hardening/determinism/audit-hash';
import { compareAuditSnapshots } from '../../phase-7/hardening/determinism/deep-structural-compare';
import { runCorruptedAuditReplayScenario, corruptAuditSnapshot } from '../../phase-7/hardening/failure-injection/corrupted-audit-replay';
import { RESOLVED_ALLOWED } from '../../phase-7/fixtures/resolution-states';
import { FOCUS_NOTIFICATION } from '../../phase-7/fixtures/action-intents';

const NOW = new Date('2025-01-15T10:00:00.000Z').getTime();

describe('7T.5 — Execution Audit Integrity', () => {
  beforeEach(() => _resetAuditForTest());

  it('tampered log is detected', () => {
    const out = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: NOW,
    });
    const corrupted = corruptAuditSnapshot(
      out.auditSnapshot,
      0,
      Object.freeze({ status: 'BLOCKED' as const, reason: 'tampered' })
    );
    const result = runCorruptedAuditReplayScenario(out.auditSnapshot, corrupted);
    expect(result.mismatchDetected).toBe(true);
  });

  it('altered order is detected when multiple entries', () => {
    const a = Object.freeze({
      actionId: 'a',
      type: 'SEND_NOTIFICATION' as const,
      sourceFeature: 'F',
      requestedAt: NOW,
      result: Object.freeze({ status: 'EXECUTED' as const, executedAt: NOW }),
    });
    const b = Object.freeze({
      actionId: 'b',
      type: 'SEND_NOTIFICATION' as const,
      sourceFeature: 'F',
      requestedAt: NOW + 1,
      result: Object.freeze({ status: 'EXECUTED' as const, executedAt: NOW + 1 }),
    });
    const combined = [a, b];
    const reversed = [b, a];
    expect(compareAuditSnapshots(combined, reversed)).not.toBeNull();
  });

  it('stable audit hash', () => {
    const out = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      nowMs: NOW,
    });
    expect(computeAuditHash(out.auditSnapshot)).toBe(computeAuditHash(out.auditSnapshot));
  });
});
