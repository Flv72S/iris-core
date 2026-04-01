/**
 * IrisCapabilitySemanticSnapshot — C.1.6
 * Snapshot immutabile di semantics. Usare Object.freeze prima dell'esposizione.
 */

import type { IrisCapabilitySemantic } from './IrisCapabilitySemantic';

export interface IrisCapabilitySemanticSnapshot {
  readonly semantics: readonly IrisCapabilitySemantic[];
  readonly derivedAt: string;
}
