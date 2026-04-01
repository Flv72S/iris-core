/**
 * Microstep 15E — Transport Abstraction Layer. In-memory transport.
 */

import { TransportError, TransportErrorCode } from './transport_errors.js';
import type { Transport } from './transport_interface.js';
import type { TransportMessage } from './transport_types.js';

export interface InMemoryTransportOptions {
  readonly node_id: string;
  readonly bus?: InMemoryTransportBus;
}

export class InMemoryTransportBus {
  private readonly nodes = new Map<string, InMemoryTransport>();

  register(node_id: string, transport: InMemoryTransport): void {
    this.nodes.set(node_id, transport);
  }

  unregister(node_id: string): void {
    this.nodes.delete(node_id);
  }

  deliver(message: TransportMessage): void {
    const recipient = message.metadata.recipient_node_id;
    if (recipient) {
      const t = this.nodes.get(recipient);
      if (t) t._deliver(message);
      return;
    }
    // broadcast
    for (const [id, t] of this.nodes.entries()) {
      if (id === message.metadata.sender_node_id) continue;
      t._deliver(message);
    }
  }
}

export class InMemoryTransport implements Transport {
  private handler: ((message: TransportMessage) => void) | null = null;
  private readonly bus: InMemoryTransportBus;
  private started = false;

  constructor(private readonly options: InMemoryTransportOptions) {
    this.bus = options.bus ?? new InMemoryTransportBus();
  }

  onReceive(handler: (message: TransportMessage) => void): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.bus.register(this.options.node_id, this);
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    this.bus.unregister(this.options.node_id);
  }

  async send(message: TransportMessage): Promise<void> {
    if (!this.started) {
      throw new TransportError(TransportErrorCode.SEND_FAILED, 'Transport not started');
    }
    this.bus.deliver(message);
  }

  _deliver(message: TransportMessage): void {
    if (!this.started) return;
    if (this.handler) this.handler(message);
  }
}

