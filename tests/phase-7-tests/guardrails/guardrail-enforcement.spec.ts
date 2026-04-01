/**
 * 7T.2 — Guardrail Enforcement Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validatePreExecution } from '@/core/execution/preexecution-validator';
import { RESOLVED_ALLOWED } from '../../phase-7/fixtures/resolution-states';
import { FOCUS_NOTIFICATION } from '../../phase-7/fixtures/action-intents';
import { wellbeingBlockGuardrail } from '@/core/execution';
import { createSharedRegistry } from '@/core/execution/killswitch-propagation';
import { _resetAuditForTest } from '@/core/execution/audit/ExecutionAuditLog';

const NOW = new Date('2025-01-15T10:00:00.000Z').getTime();

describe('7T.2 — Guardrail Enforcement', () => {
  beforeEach(() => {
    _resetAuditForTest();
  });

  it('wellbeing abort: validation BLOCKED with reason', () => {
    const context = {
      now: NOW,
      registry: createSharedRegistry(),
      getRecentEntries: () => [] as const,
      wellbeingBlocked: true,
    };
    const action = {
      id: FOCUS_NOTIFICATION.id,
      type: FOCUS_NOTIFICATION.type,
      payload: FOCUS_NOTIFICATION.payload,
      requestedAt: NOW,
      sourceFeature: FOCUS_NOTIFICATION.sourceFeature,
    };
    const validation = validatePreExecution(action, context, {
      guardrails: [wellbeingBlockGuardrail],
    });
    expect(validation.allowed).toBe(false);
    if (!validation.allowed) {
      expect(validation.phase).toBe('GUARDRAIL');
      expect(validation.reason.length).toBeGreaterThan(0);
    }
  });

  it('no abort when wellbeingBlocked false', () => {
    const context = {
      now: NOW,
      registry: createSharedRegistry(),
      getRecentEntries: () => [] as const,
      wellbeingBlocked: false,
    };
    const action = {
      id: FOCUS_NOTIFICATION.id,
      type: FOCUS_NOTIFICATION.type,
      payload: FOCUS_NOTIFICATION.payload,
      requestedAt: NOW,
      sourceFeature: FOCUS_NOTIFICATION.sourceFeature,
    };
    const validation = validatePreExecution(action, context, {
      guardrails: [wellbeingBlockGuardrail],
    });
    expect(validation.allowed).toBe(true);
  });
});
