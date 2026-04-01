/**
 * Microstep 15E.1 — gRPC Transport Plugin. Server.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TransportMessage } from '../transport/transport_types.js';
import { GrpcTransportError, GrpcTransportErrorCode } from './transport_grpc_errors.js';
import type { GrpcTransportConfig } from './transport_grpc_types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadProtoPath(): string {
  return path.join(__dirname, 'transport_grpc_proto.proto');
}

export interface GrpcServerHandle {
  stop(): Promise<void>;
}

export function startGrpcServer(
  config: GrpcTransportConfig,
  onMessage: (message: TransportMessage) => void,
): Promise<GrpcServerHandle> {
  const packageDefinition = protoLoader.loadSync(loadProtoPath(), {
    keepCase: true,
    longs: String,
    defaults: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition) as {
    iris?: { transport?: { IrisTransportService?: grpc.ServiceClientConstructor } };
  };
  const serviceCtor = proto?.iris?.transport?.IrisTransportService;
  const serviceDef = serviceCtor?.service;
  if (!serviceCtor || !serviceDef) {
    return Promise.reject(new GrpcTransportError(GrpcTransportErrorCode.SERVER_ERROR, 'Failed to load IrisTransportService'));
  }

  const impl: grpc.UntypedServiceImplementation = {
    SendMessage: (call: grpc.ServerUnaryCall<ProtoMessage, ProtoAck>, callback: grpc.sendUnaryData<ProtoAck>) => {
      const req = call.request as ProtoMessage;
      const replyErr = (details: string) =>
        callback({ code: grpc.status.INVALID_ARGUMENT, details }, null);

      try {
        if (typeof req.sender !== 'string' || req.sender.trim().length === 0) {
          return replyErr('Missing sender');
        }
        if (typeof req.recipient !== 'string' || req.recipient.trim().length === 0) {
          return replyErr('Missing recipient');
        }
        let raw: unknown = null;
        if (typeof req.payload === 'string' && req.payload.length > 0) {
          try {
            raw = JSON.parse(req.payload) as unknown;
          } catch {
            return replyErr('Invalid payload JSON');
          }
        }
        const timestamp = typeof req.timestamp === 'string' ? parseInt(req.timestamp, 10) : Number(req.timestamp);
        if (Number.isNaN(timestamp)) {
          return replyErr('Invalid timestamp');
        }
        const metadata: TransportMessage['metadata'] =
          typeof req.type === 'string'
            ? {
                sender_node_id: req.sender,
                recipient_node_id: req.recipient,
                timestamp,
                type: req.type,
              }
            : {
                sender_node_id: req.sender,
                recipient_node_id: req.recipient,
                timestamp,
              };
        const message: TransportMessage = { raw, metadata };
        onMessage(message);
        callback(null, { success: true });
      } catch (e) {
        callback(
          { code: grpc.status.INTERNAL, details: e instanceof Error ? e.message : String(e) },
          null,
        );
      }
    },
  };

  const server = new grpc.Server();
  server.addService(serviceDef, impl);

  return new Promise((resolve, reject) => {
    server.bindAsync(
      `${config.host}:${config.port}`,
      grpc.ServerCredentials.createInsecure(),
      (err) => {
        if (err) return reject(new GrpcTransportError(GrpcTransportErrorCode.SERVER_ERROR, err.message));
        server.start();
        resolve({
          stop: () =>
            new Promise((res, rej) => {
              server.tryShutdown((e) => (e ? rej(e) : res()));
            }),
        });
      },
    );
  });
}

interface ProtoMessage {
  sender?: string;
  recipient?: string;
  type?: string;
  payload?: string;
  timestamp?: string | number;
}

interface ProtoAck {
  success?: boolean;
}
