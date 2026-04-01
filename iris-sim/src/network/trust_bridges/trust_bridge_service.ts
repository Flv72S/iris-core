/**
 * Phase 13XX-H — Cross-Network Trust Bridges. Central service.
 */

import type { NodeIdentity } from '../node_identity/index.js';
import type { BridgeRegistry } from './bridge_registry.js';
import type { ExternalNodeAdapter } from './external_node_adapter.js';
import type { ExternalIdentity } from './external_identity.js';
import { BridgeError, BridgeErrorCode } from './bridge_errors.js';

export class TrustBridgeService {
  constructor(
    private readonly registry: BridgeRegistry,
    private readonly adapter: ExternalNodeAdapter
  ) {}

  /**
   * Resolve external identity to IRIS NodeIdentity via the given bridge.
   * Caller must still run NodeIdentityVerifier and NodeOnboardingService.
   */
  registerExternalNode(external: ExternalIdentity, bridge_id: string): NodeIdentity {
    const bridge = this.registry.getBridge(bridge_id);
    if (bridge == null) {
      throw new BridgeError(`Bridge not found: ${bridge_id}`, BridgeErrorCode.BRIDGE_NOT_FOUND);
    }
    return this.adapter.adapt(external, bridge);
  }
}
