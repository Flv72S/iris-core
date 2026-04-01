/**
 * ActionIntent fixture types — per-domain, deterministic.
 */

import type { ExecutionActionType } from '../../../../src/core/execution/ExecutionAction';

/** Domain label for isolation (maps to executor / action types). */
export type FixtureDomain = 'inbox' | 'tasks' | 'calendar' | 'focus';

/** Single action intent fixture: static, serializable. */
export type ActionIntentFixture = {
  readonly id: string;
  readonly domain: FixtureDomain;
  /** Execution action type (SEND_NOTIFICATION | SCHEDULE_EVENT | BLOCK_INPUT | DEFER_MESSAGE). */
  readonly type: ExecutionActionType;
  readonly payload: Record<string, unknown>;
  /** Resolution id this intent belongs to (for correlation). */
  readonly resolutionId: string;
  /** sourceFeature for guardrail/kill-switch. */
  readonly sourceFeature: string;
  /** Fixed timestamp string for determinism. */
  readonly requestedAtIso: string;
  readonly idempotencyKey: string | null;
};
