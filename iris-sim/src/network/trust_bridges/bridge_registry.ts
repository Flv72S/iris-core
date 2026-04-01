/**
 * Phase 13XX-H — Cross-Network Trust Bridges. Registry.
 */

import type { TrustBridge } from './trust_bridge_interface.js';

export class BridgeRegistry {
  private readonly byId = new Map<string, TrustBridge>();

  registerBridge(bridge: TrustBridge): void {
    this.byId.set(bridge.bridge_id, bridge);
  }

  getBridge(bridge_id: string): TrustBridge | null {
    return this.byId.get(bridge_id) ?? null;
  }

  listBridges(): TrustBridge[] {
    return [...this.byId.values()];
  }
}
