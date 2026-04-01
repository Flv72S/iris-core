/**
 * Microstep 15E.2 — WebSocket/P2P Transport. Peer manager.
 */

import type { WsConnection, WsPeer } from './transport_ws_types.js';

export class WsPeerManager {
  private readonly peers = new Map<string, WsPeer>();
  private readonly connections = new Map<string, WsConnection>();

  addPeer(peer: WsPeer): void {
    this.peers.set(peer.node_id, peer);
  }

  removePeer(node_id: string): void {
    this.peers.delete(node_id);
    this.connections.delete(node_id);
  }

  getPeer(node_id: string): WsPeer | undefined {
    return this.peers.get(node_id);
  }

  setConnection(connection: WsConnection): void {
    this.connections.set(connection.node_id, connection);
  }

  removeConnection(node_id: string): void {
    this.connections.delete(node_id);
  }

  getConnection(node_id: string): WsConnection | undefined {
    return this.connections.get(node_id);
  }

  getAllConnections(): WsConnection[] {
    return Array.from(this.connections.values());
  }

  /** Clear peer connection map after sockets have been terminated (shutdown). */
  clearAllConnections(): void {
    this.connections.clear();
  }
}

