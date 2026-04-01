/**
 * IrisCapabilityEngine — C.1.5
 * Espone snapshot di capability. Kill-switch OFF → snapshot vuoto.
 * Nessuna deduplicazione, nessuna validazione semantica. Output sempre frozen.
 */

import type { IrisCapability } from './IrisCapability';
import type { IrisCapabilitySnapshot } from './IrisCapabilitySnapshot';
import type { IrisCapabilityRegistry } from './IrisCapabilityRegistry';
import { isCapabilityModelEnabled } from './IrisCapabilityRegistry';

export class IrisCapabilityEngine {
  constructor(private readonly capabilities: readonly IrisCapability[]) {}

  /**
   * Restituisce snapshot delle capability. Se registry OFF → capabilities [].
   */
  getSnapshot(registry: IrisCapabilityRegistry): IrisCapabilitySnapshot {
    const derivedAt =
      this.capabilities.length > 0 && this.capabilities[0].derivedAt
        ? this.capabilities[0].derivedAt
        : new Date().toISOString();
    if (!isCapabilityModelEnabled(registry)) {
      return Object.freeze({
        capabilities: Object.freeze([]),
        derivedAt,
      });
    }
    const frozen = this.capabilities.map((c) =>
      Object.freeze({
        capabilityId: c.capabilityId,
        capabilityType: c.capabilityType,
        description: c.description,
        ...(c.inputs != null && { inputs: Object.freeze([...c.inputs]) }),
        ...(c.outputs != null && { outputs: Object.freeze([...c.outputs]) }),
        ...(c.constraints != null && { constraints: Object.freeze({ ...c.constraints }) }),
        ...(c.metadata != null && { metadata: Object.freeze({ ...c.metadata }) }),
        derivedAt: c.derivedAt,
      })
    );
    return Object.freeze({
      capabilities: Object.freeze(frozen),
      derivedAt,
    });
  }
}
