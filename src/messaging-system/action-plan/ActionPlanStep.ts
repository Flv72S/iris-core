/**
 * ActionPlanStep — C.2
 * Step dichiarativo di un Action Plan. Riferimento a capability e semantic, nessuna esecuzione.
 */

import type { IrisCapabilityType } from '../capabilities/IrisCapabilityType';

export interface ActionPlanStep {
  readonly stepId: string;
  readonly capabilityType: IrisCapabilityType;
  readonly semanticId: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly effects: readonly string[];
  readonly dependencies?: readonly string[];
}
