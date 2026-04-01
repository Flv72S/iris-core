/**
 * AdapterCapabilityMatrix - C.4.A
 * Matrice centrale: adapter e capability dichiarativi. Nessuna esecuzione.
 */

import type { AdapterDescriptor } from './AdapterDescriptor';
import type { MessagingCapability } from './MessagingCapability';

export interface AdapterCapabilityMatrix {
  readonly adapters: readonly AdapterDescriptor[];
  readonly capabilities: readonly MessagingCapability[];
  readonly declaredAt: string;
}
