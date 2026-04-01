/**
 * ActionPlan — C.2
 * Piano operativo dichiarativo. MUST NOT: execute, run, dispatch, adapter, channel, provider, model, retry, priority, score.
 */

import type { ActionPlanStep } from './ActionPlanStep';

export interface ActionPlan {
  readonly planId: string;
  readonly intentId: string;
  readonly contractIds: readonly string[];
  readonly steps: readonly ActionPlanStep[];
  readonly expectedEffects: readonly string[];
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
