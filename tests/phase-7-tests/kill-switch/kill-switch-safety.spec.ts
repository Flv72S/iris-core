/**
 * 7T.3 — Kill-Switch Safety Tests
 */

import { describe, it, expect } from 'vitest';
import { runExecutionHarness } from '../../phase-7/harness/execution-harness';
import { RESOLVED_ALLOWED } from '../../phase-7/fixtures/resolution-states';
import { FOCUS_NOTIFICATION, INBOX_DEFER_MESSAGE } from '../../phase-7/fixtures/action-intents';
import { GLOBAL_OFF, FEATURE_OFF, ACTION_TYPE_OFF } from '../../phase-7/fixtures/kill-switch-scenarios';
import { createSharedRegistry, triggerGlobalStop } from '@/core/execution/killswitch-propagation';
import { isExecutionAllowedForAction, getFeatureKillSwitchKey } from '@/core/execution/execution-killswitch';
import { SEND_NOTIFICATION_COMPONENT_ID } from '@/core/execution/kill-switch/ExecutionKillSwitch';
import {
  ExecutionEngine,
  wellbeingBlockGuardrail,
  maxActionsPerWindowGuardrail,
  cooldownPerFeatureGuardrail,
  notificationAdapter,
  calendarAdapter,
  blockInputAdapter,
  deferMessageAdapter,
} from '@/core/execution';

const NOW = new Date('2025-01-15T10:00:00.000Z').getTime();

describe('7T.3 — Kill-Switch Safety', () => {
  it('global kill-switch: BLOCKED, no EXECUTED in audit', () => {
    const out = runExecutionHarness({
      resolution: RESOLVED_ALLOWED,
      intentFixture: FOCUS_NOTIFICATION,
      killSwitch: GLOBAL_OFF,
      nowMs: NOW,
    });
    expect(out.result.status).toBe('BLOCKED');
    const executed = out.auditSnapshot.filter((e) => e.result.status === 'EXECUTED');
    expect(executed.length).toBe(0);
  });

  it('global kill during execution: second run BLOCKED, audit append-only', () => {
    const registry = createSharedRegistry();
    const run = () => {
      const o = runExecutionHarness({
        resolution: RESOLVED_ALLOWED,
        intentFixture: FOCUS_NOTIFICATION,
        registry,
        nowMs: NOW,
      });
      return { result: o.result, auditLength: o.auditSnapshot.length };
    };
    const first = run();
    triggerGlobalStop(registry);
    const second = run();
    expect(second.result.status).toBe('BLOCKED');
    expect(second.auditLength).toBeGreaterThanOrEqual(first.auditLength);
  });

  it('feature kill-switch: isExecutionAllowedForAction returns false for disabled feature', () => {
    const registry = createSharedRegistry();
    (registry as Record<string, boolean>)[getFeatureKillSwitchKey('Wellbeing')] = false;
    const action = {
      id: INBOX_DEFER_MESSAGE.id,
      type: INBOX_DEFER_MESSAGE.type,
      payload: INBOX_DEFER_MESSAGE.payload,
      requestedAt: NOW,
      sourceFeature: INBOX_DEFER_MESSAGE.sourceFeature,
    };
    expect(isExecutionAllowedForAction(action, registry)).toBe(false);
  });

  it('action-type kill-switch: ExecutionEngine BLOCKED for disabled type', () => {
    const engine = new ExecutionEngine(
      [wellbeingBlockGuardrail, maxActionsPerWindowGuardrail, cooldownPerFeatureGuardrail],
      [notificationAdapter, calendarAdapter, blockInputAdapter, deferMessageAdapter]
    );
    const registry = createSharedRegistry();
    (registry as Record<string, boolean>)[SEND_NOTIFICATION_COMPONENT_ID] = false;
    const action = {
      id: FOCUS_NOTIFICATION.id,
      type: FOCUS_NOTIFICATION.type,
      payload: FOCUS_NOTIFICATION.payload,
      requestedAt: NOW,
      sourceFeature: FOCUS_NOTIFICATION.sourceFeature,
    };
    const result = engine.execute(action, {
      now: NOW,
      registry,
      getRecentEntries: () => [],
      wellbeingBlocked: false,
    });
    expect(result.status).toBe('BLOCKED');
  });
});
