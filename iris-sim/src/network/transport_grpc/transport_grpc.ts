/**
 * Microstep 15E.1 — gRPC Transport Plugin. Main transport implementing Transport (15E).
 */

import type { Transport } from '../transport/transport_interface.js';
import type { TransportMessage } from '../transport/transport_types.js';
import { GrpcTransportError, GrpcTransportErrorCode } from './transport_grpc_errors.js';
import type { GrpcTransportConfig, GrpcPeer } from './transport_grpc_types.js';
import { sendGrpcMessage } from './transport_grpc_client.js';
import { startGrpcServer, type GrpcServerHandle } from './transport_grpc_server.js';

export class GrpcTransport implements Transport {
  private handler: ((message: TransportMessage) => void) | null = null;
  private serverHandle: GrpcServerHandle | null = null;
  private readonly peers = new Map<string, string>(); // node_id -> address

  constructor(private readonly config: GrpcTransportConfig) {
    for (const p of config.peers ?? []) {
      this.peers.set(p.node_id, p.address);
    }
  }

  onReceive(handler: (message: TransportMessage) => void): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    if (this.serverHandle) return;
    this.serverHandle = await startGrpcServer(this.config, (msg) => {
      if (this.handler) this.handler(msg);
    });
  }

  async stop(): Promise<void> {
    if (!this.serverHandle) return;
    await this.serverHandle.stop();
    this.serverHandle = null;
  }

  async send(message: TransportMessage): Promise<void> {
    const recipient = message.metadata.recipient_node_id;
    if (!recipient || recipient.trim().length === 0) {
      throw new GrpcTransportError(GrpcTransportErrorCode.INVALID_MESSAGE, 'Missing recipient for send');
    }
    const address = this.peers.get(recipient);
    if (!address) {
      throw new GrpcTransportError(GrpcTransportErrorCode.CONNECTION_FAILED, `Unknown peer: ${recipient}`);
    }
    await sendGrpcMessage(address, message, { timeoutMs: 10_000 });
  }

  registerPeer(peer: GrpcPeer): void {
    this.peers.set(peer.node_id, peer.address);
  }
}
