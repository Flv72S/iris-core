/**
 * Microstep 14T — Advanced Trust & Federation. Revocation helper.
 */

import type { TrustRegistry } from './trust_registry.js';

export class TrustRevocation {
  constructor(private readonly registry: TrustRegistry) {}

  isRevoked(node_id: string, key_id: string): boolean {
    const key = this.registry.getKey(node_id, key_id);
    return Boolean(key?.revoked);
  }
}

