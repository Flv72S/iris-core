/**
 * MessagingCapabilityRegistry — C.4.A
 * Registry read-only della matrice. Nessuno stato mutabile, nessun override dinamico.
 */

import type { AdapterCapabilityMatrix } from './AdapterCapabilityMatrix';
import type { MessagingCapability } from './MessagingCapability';
import type { AdapterDescriptor } from './AdapterDescriptor';
import type { AdapterType } from './AdapterType';

export class MessagingCapabilityRegistry {
  private readonly _matrix: AdapterCapabilityMatrix;

  constructor(matrix: AdapterCapabilityMatrix) {
    this._matrix = Object.freeze({
      adapters: Object.freeze([...matrix.adapters]),
      capabilities: Object.freeze([...matrix.capabilities]),
      declaredAt: matrix.declaredAt,
    });
  }

  getCapabilities(): readonly MessagingCapability[] {
    return this._matrix.capabilities;
  }

  getAdapters(): readonly AdapterDescriptor[] {
    return this._matrix.adapters;
  }

  findCapabilitiesByAdapter(adapterType: AdapterType): readonly MessagingCapability[] {
    const adapter = this._matrix.adapters.find((a) => a.adapterType === adapterType);
    if (!adapter) return Object.freeze([]);
    const types = new Set(adapter.supportedCapabilities);
    return Object.freeze(this._matrix.capabilities.filter((c) => types.has(c.capabilityType)));
  }
}
