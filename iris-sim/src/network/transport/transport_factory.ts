/**
 * Microstep 15E — Transport Abstraction Layer. Factory.
 */

import { TransportError, TransportErrorCode } from './transport_errors.js';
import type { Transport } from './transport_interface.js';
import type { TransportFactoryConfig } from './transport_types.js';
import { HttpTransport } from './transport_http.js';
import { InMemoryTransport } from './transport_inmemory.js';
import type { HttpTransportConfig } from './transport_types.js';
import type { InMemoryTransportOptions } from './transport_inmemory.js';
import { GrpcTransport } from '../transport_grpc/index.js';
import type { GrpcTransportConfig } from '../transport_grpc/index.js';
import { WsTransport } from '../transport_ws/index.js';
import type { WsTransportConfig } from '../transport_ws/index.js';

export class TransportFactory {
  create(config: TransportFactoryConfig): Transport {
    if (config.type === 'http') {
      const opts = config.options as HttpTransportConfig | undefined;
      if (!opts || typeof opts.port !== 'number') {
        throw new TransportError(TransportErrorCode.INVALID_MESSAGE, 'Invalid HTTP transport config');
      }
      return new HttpTransport(opts);
    }

    if (config.type === 'inmemory') {
      const opts = config.options as InMemoryTransportOptions | undefined;
      if (!opts || typeof opts.node_id !== 'string' || opts.node_id.trim().length === 0) {
        throw new TransportError(TransportErrorCode.INVALID_MESSAGE, 'Invalid in-memory transport config');
      }
      return new InMemoryTransport(opts);
    }

    if (config.type === 'grpc') {
      const opts = config.options as GrpcTransportConfig | undefined;
      if (!opts || typeof opts.node_id !== 'string' || opts.node_id.trim().length === 0) {
        throw new TransportError(TransportErrorCode.INVALID_MESSAGE, 'Invalid gRPC transport config: node_id required');
      }
      if (typeof opts.host !== 'string' || typeof opts.port !== 'number') {
        throw new TransportError(TransportErrorCode.INVALID_MESSAGE, 'Invalid gRPC transport config: host and port required');
      }
      return new GrpcTransport(opts);
    }

    if (config.type === 'ws') {
      const opts = config.options as WsTransportConfig | undefined;
      if (!opts || typeof opts.node_id !== 'string' || opts.node_id.trim().length === 0) {
        throw new TransportError(TransportErrorCode.INVALID_MESSAGE, 'Invalid WS transport config: node_id required');
      }
      if (typeof opts.port !== 'number') {
        throw new TransportError(TransportErrorCode.INVALID_MESSAGE, 'Invalid WS transport config: port required');
      }
      return new WsTransport(opts);
    }

    throw new TransportError(TransportErrorCode.UNSUPPORTED_TRANSPORT, `Unsupported transport: ${String(config.type)}`);
  }
}

