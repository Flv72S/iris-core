/**
 * Microstep 15E — Transport Abstraction Layer. Types.
 */

export interface TransportMessage {
  readonly raw: unknown;
  readonly metadata: {
    readonly sender_node_id: string;
    readonly recipient_node_id?: string;
    readonly timestamp: number;
    readonly type?: string;
  };
}

export interface HttpTransportConfig {
  readonly port: number;
  readonly host?: string;
}

export interface TransportFactoryConfig {
  readonly type: 'http' | 'inmemory' | 'grpc' | 'ws';
  readonly options?: unknown;
}

