/**
 * Microstep 15E.2 — WebSocket/P2P Transport. Main transport.
 */

import { setTimeout as sleep } from 'node:timers/promises';
import WebSocket from 'ws';
import type { Transport } from '../transport/transport_interface.js';
import type { TransportMessage } from '../transport/transport_types.js';
import { WsPeerManager } from './transport_ws_peer_manager.js';
import { WsTransportError, WsTransportErrorCode } from './transport_ws_errors.js';
import type { WsPeer, WsTransportConfig, WsWireMessage } from './transport_ws_types.js';
import { connectWsPeer, sendWsWireMessage, type WsClientHandle } from './transport_ws_client.js';
import { startWsServer, type WsServerHandle } from './transport_ws_server.js';

export class WsTransport implements Transport {
  private readonly peers = new WsPeerManager();
  private readonly clientHandles = new Map<string, WsClientHandle>();
  private readonly socketToNode = new WeakMap<WebSocket, string>();
  private serverHandle: WsServerHandle | null = null;
  private handler: ((message: TransportMessage) => void) | null = null;

  constructor(private readonly config: WsTransportConfig) {
    for (const p of config.peers ?? []) this.peers.addPeer(p);
  }

  onReceive(handler: (message: TransportMessage) => void): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    if (this.serverHandle) return;
    this.serverHandle = await startWsServer({
      config: this.config,
      onConnection: () => {},
      onDisconnect: (socket) => {
        const node_id = this.socketToNode.get(socket);
        if (node_id) {
          this.peers.removeConnection(node_id);
          this.socketToNode.delete(socket);
        }
      },
      onWireMessage: (socket, wire) => this.handleWire(socket, wire),
    });
    for (const peer of this.config.peers ?? []) {
      this.connectPeer(peer);
    }
  }

  async stop(): Promise<void> {
    for (const h of this.clientHandles.values()) {
      await h.shutdown();
    }
    this.clientHandles.clear();

    for (const c of this.peers.getAllConnections()) {
      try {
        c.socket.removeAllListeners();
        c.socket.terminate();
      } catch {
        // ignore
      }
    }
    this.peers.clearAllConnections();

    if (this.serverHandle) {
      try {
        for (const client of [...this.serverHandle.server.clients]) {
          try {
            client.terminate();
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    if (this.serverHandle) await this.serverHandle.stop();
    this.serverHandle = null;

    await sleep(10);
  }

  async send(message: TransportMessage): Promise<void> {
    const recipient = message.metadata.recipient_node_id;
    if (!recipient || recipient.trim().length === 0) {
      throw new WsTransportError(WsTransportErrorCode.INVALID_MESSAGE, 'Missing recipient');
    }
    const conn = await this.awaitConnection(recipient, 1_200);
    if (!conn) {
      throw new WsTransportError(WsTransportErrorCode.PEER_NOT_FOUND, `No connection for peer ${recipient}`);
    }
    const wire: WsWireMessage = {
      raw: JSON.stringify(message.raw),
      metadata: {
        sender: message.metadata.sender_node_id,
        recipient: message.metadata.recipient_node_id,
        timestamp: message.metadata.timestamp,
        ...(message.metadata.type != null ? { type: message.metadata.type } : {}),
      },
    };
    await sendWsWireMessage(conn.socket, wire);
  }

  registerPeer(peer: WsPeer): void {
    this.peers.addPeer(peer);
    this.connectPeer(peer);
  }

  private connectPeer(peer: WsPeer): void {
    if (this.clientHandles.has(peer.node_id)) return;
    let handle: WsClientHandle;
    handle = connectWsPeer({
      local_node_id: this.config.node_id,
      peer,
      onOpen: (socket) => {
        this.peers.setConnection({ node_id: peer.node_id, socket });
        this.socketToNode.set(socket, peer.node_id);
      },
      onClose: () => {
        this.peers.removeConnection(peer.node_id);
      },
      onWireMessage: (wire) => {
        // Dispatch both for server-side and client-side sockets.
        // Duplicate suppression is intentionally handled at higher layers (15D/15B).
        const sock = handle.socket;
        if (sock) this.handleWire(sock, wire);
      },
      reconnect: true,
    });
    this.clientHandles.set(peer.node_id, handle);
  }

  private async awaitConnection(node_id: string, timeoutMs: number): Promise<{ node_id: string; socket: WebSocket } | null> {
    const direct = this.peers.getConnection(node_id);
    if (direct) return direct;

    const peer = this.peers.getPeer(node_id);
    if (peer) this.connectPeer(peer);

    const start = Date.now();
    while (Date.now() - start <= timeoutMs) {
      const current = this.peers.getConnection(node_id);
      if (current) return current;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return null;
  }

  private handleWire(socket: WebSocket, wire: WsWireMessage): void {
    if (wire.metadata.type === '__peer_hello__') {
      const node = wire.metadata.sender;
      if (node.trim().length > 0) {
        this.peers.setConnection({ node_id: node, socket });
        this.socketToNode.set(socket, node);
      }
      return;
    }
    if (typeof wire.metadata.sender !== 'string' || wire.metadata.sender.trim().length === 0) return;
    if (wire.metadata.recipient != null && wire.metadata.recipient !== this.config.node_id) return;

    let raw: unknown = null;
    try {
      raw = wire.raw.length > 0 ? (JSON.parse(wire.raw) as unknown) : null;
    } catch {
      return;
    }

    const metadata: TransportMessage['metadata'] = {
      sender_node_id: wire.metadata.sender,
      timestamp: wire.metadata.timestamp,
      ...(wire.metadata.recipient != null ? { recipient_node_id: wire.metadata.recipient } : {}),
      ...(wire.metadata.type != null ? { type: wire.metadata.type } : {}),
    };
    const message: TransportMessage = {
      raw,
      metadata,
    };
    if (this.handler) this.handler(message);
  }
}

