/**
 * ExecutionRequest — C.3
 * Richiesta di esecuzione. Solo planSnapshot; nessun retry, priority, schedule, SLA, channel, adapter, model.
 */

import type { ActionPlanSnapshot } from '../action-plan/ActionPlanSnapshot';

export interface ExecutionRequest {
  readonly executionId: string;
  readonly planSnapshot: ActionPlanSnapshot;
  readonly requestedAt: string;
}
