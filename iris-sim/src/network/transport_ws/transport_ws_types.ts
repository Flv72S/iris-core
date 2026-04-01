/**
 * Microstep 15E.2 — WebSocket/P2P Transport. Types.
 */

import type WebSocket from 'ws';

export interface WsTransportConfig {
  readonly node_id: string;
  readonly port: number;
  readonly host?: string;
  readonly peers?: readonly WsPeer[];
}

export interface WsPeer {
  readonly node_id: string;
  readonly url: string; // ws://host:port
}

export interface WsConnection {
  readonly node_id: string;
  readonly socket: WebSocket;
}

export interface WsWireMessage {
  readonly raw: string;
  readonly metadata: {
    readonly sender: string;
    readonly recipient?: string;
    readonly timestamp: number;
    readonly type?: string;
  };
}

