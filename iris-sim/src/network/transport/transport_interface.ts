/**
 * Microstep 15E — Transport Abstraction Layer. Core contract.
 */

import type { TransportMessage } from './transport_types.js';

export interface Transport {
  send(message: TransportMessage): Promise<void>;
  onReceive(handler: (message: TransportMessage) => void): void;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

