/**
 * ExecutionSemanticRequirement - C.4.B
 * Requisito dichiarativo per l'esecuzione. Nessuna esecuzione.
 */

import type { MessagingCapabilityType } from '../capabilities/MessagingCapabilityType';
import type { AdapterType } from '../capabilities/AdapterType';

export interface ExecutionSemanticRequirement {
  readonly requirementId: string;
  readonly actionPlanId: string;
  readonly requiredCapabilities: readonly MessagingCapabilityType[];
  readonly requiredAdapterTypes?: readonly AdapterType[];
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly declaredAt: string;
}
