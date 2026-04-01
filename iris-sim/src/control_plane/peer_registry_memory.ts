import type { PeerInfo } from './peer_types.js';
import type { PeerRegistry } from './peer_registry.js';

export class InMemoryPeerRegistry implements PeerRegistry {
  private readonly byId = new Map<string, PeerInfo>();

  resolve(nodeId: string): PeerInfo | null {
    return this.byId.get(nodeId) ?? null;
  }

  register(peer: PeerInfo): void {
    this.byId.set(peer.nodeId, { ...peer });
  }

  revoke(nodeId: string): void {
    const p = this.byId.get(nodeId);
    if (p) {
      this.byId.set(nodeId, { ...p, revoked: true, trusted: false });
    }
  }
}
