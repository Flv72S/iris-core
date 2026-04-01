/**
 * IrisCapabilitySnapshot — C.1.5
 * Snapshot immutabile di capability. Usare Object.freeze prima dell'esposizione.
 */

import type { IrisCapability } from './IrisCapability';

export interface IrisCapabilitySnapshot {
  readonly capabilities: readonly IrisCapability[];
  readonly derivedAt: string;
}
