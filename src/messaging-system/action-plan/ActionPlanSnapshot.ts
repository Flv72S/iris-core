/**
 * ActionPlanSnapshot — C.2
 * Snapshot immutabile di piani. Usare Object.freeze prima dell'esposizione.
 */

import type { ActionPlan } from './ActionPlan';

export interface ActionPlanSnapshot {
  readonly plans: readonly ActionPlan[];
  readonly derivedAt: string;
}
