/**
 * IrisCapabilitySemanticEngine — C.1.6
 * Associa semantics alle capability per capabilityType. Kill-switch OFF → snapshot vuoto.
 * Nessuna inferenza, deduplicazione o validazione semantica. Output sempre frozen.
 */

import type { IrisCapabilitySnapshot } from '../IrisCapabilitySnapshot';
import type { IrisCapabilitySemantic } from './IrisCapabilitySemantic';
import type { IrisCapabilitySemanticSnapshot } from './IrisCapabilitySemanticSnapshot';
import type { IrisCapabilitySemanticRegistry } from './IrisCapabilitySemanticRegistry';
import { isCapabilitySemanticEnabled } from './IrisCapabilitySemanticRegistry';

export class IrisCapabilitySemanticEngine {
  constructor(private readonly semantics: readonly IrisCapabilitySemantic[]) {}

  /**
   * Restituisce semantics associate alle capability nello snapshot (per capabilityType).
   * Se registry OFF → semantics [].
   */
  getSnapshot(
    capabilitySnapshot: IrisCapabilitySnapshot,
    registry: IrisCapabilitySemanticRegistry
  ): IrisCapabilitySemanticSnapshot {
    const derivedAt = capabilitySnapshot.derivedAt;
    if (!isCapabilitySemanticEnabled(registry)) {
      return Object.freeze({
        semantics: Object.freeze([]),
        derivedAt,
      });
    }
    const capabilityTypes = new Set(capabilitySnapshot.capabilities.map((c) => c.capabilityType));
    const filtered = this.semantics.filter((s) => capabilityTypes.has(s.capabilityType));
    const frozen = filtered.map((s) =>
      Object.freeze({
        semanticId: s.semanticId,
        capabilityType: s.capabilityType,
        domain: s.domain,
        intentCategory: s.intentCategory,
        inputs: Object.freeze([...s.inputs]),
        outputs: Object.freeze([...s.outputs]),
        effects: Object.freeze([...s.effects]),
        ...(s.constraints != null && { constraints: Object.freeze({ ...s.constraints }) }),
        ...(s.metadata != null && { metadata: Object.freeze({ ...s.metadata }) }),
        derivedAt: s.derivedAt,
      })
    );
    return Object.freeze({
      semantics: Object.freeze(frozen),
      derivedAt,
    });
  }
}
