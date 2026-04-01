/**
 * ExecutableActionPlanSnapshot — C.4
 * Piano già validato come READY. Unico input eseguibile dall'engine.
 */

import type { ActionPlan } from '../action-plan/ActionPlan';

export interface ExecutableActionPlanSnapshot {
  readonly plan: ActionPlan;
  /** Deve essere 'READY'; l'engine verifica e lancia se diverso. */
  readonly readinessStatus: 'READY';
}
