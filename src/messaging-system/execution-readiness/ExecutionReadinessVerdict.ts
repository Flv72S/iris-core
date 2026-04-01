/**
 * ExecutionReadinessVerdict - C.4.C
 * Verdetto dichiarativo. MUST NOT: execute, send, dispatch, adapterId, channelId, retry, priority, score.
 */

import type { ExecutionReadinessStatus } from './ExecutionReadinessStatus';
import type { ExecutionSafetyFlag } from './ExecutionSafetyFlag';

export interface ExecutionReadinessVerdict {
  readonly planId: string;
  readonly status: ExecutionReadinessStatus;
  readonly reasons: readonly string[];
  readonly safetyFlags?: readonly ExecutionSafetyFlag[];
  readonly derivedAt: string;
}
