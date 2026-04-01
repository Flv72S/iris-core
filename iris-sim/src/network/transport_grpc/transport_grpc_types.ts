/**
 * Microstep 15E.1 — gRPC Transport Plugin. Types.
 */

export interface GrpcTransportConfig {
  readonly node_id: string;
  readonly host: string;
  readonly port: number;
  readonly peers?: readonly GrpcPeer[];
}

export interface GrpcPeer {
  readonly node_id: string;
  readonly address: string; // host:port
}
