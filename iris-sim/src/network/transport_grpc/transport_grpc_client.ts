/**
 * Microstep 15E.1 — gRPC Transport Plugin. Client.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TransportMessage } from '../transport/transport_types.js';
import { GrpcTransportError, GrpcTransportErrorCode } from './transport_grpc_errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadProtoPath(): string {
  return path.join(__dirname, 'transport_grpc_proto.proto');
}

interface ProtoMessage {
  sender: string;
  recipient: string;
  type?: string;
  payload: string;
  timestamp: number | string;
}

type GrpcClientCtor = new (
  address: string,
  creds: grpc.ChannelCredentials,
  options?: object,
) => grpc.Client & { SendMessage?: UnaryMethod; sendMessage?: UnaryMethod };

type UnaryMethod = (req: ProtoMessage, options: grpc.CallOptions, cb: grpc.requestCallback<{ success?: boolean }>) => void;

let cachedClientConstructor: GrpcClientCtor | null = null;

function getClientConstructor(): GrpcClientCtor {
  if (cachedClientConstructor) return cachedClientConstructor;
  const packageDefinition = protoLoader.loadSync(loadProtoPath(), {
    keepCase: true,
    longs: String,
    defaults: true,
  });
  const pkg = grpc.loadPackageDefinition(packageDefinition) as {
    iris?: { transport?: { IrisTransportService: GrpcClientCtor } };
  };
  const Service = pkg?.iris?.transport?.IrisTransportService;
  if (!Service) {
    throw new GrpcTransportError(GrpcTransportErrorCode.SERVER_ERROR, 'Failed to load IrisTransportService client');
  }
  cachedClientConstructor = Service;
  return Service;
}

export function sendGrpcMessage(
  address: string,
  message: TransportMessage,
  options?: { timeoutMs?: number },
): Promise<void> {
  const Client = getClientConstructor();
  const client = new Client(address, grpc.credentials.createInsecure(), {
    'grpc.max_receive_message_length': 4 * 1024 * 1024,
    'grpc.max_send_message_length': 4 * 1024 * 1024,
  });

  const payload =
    message.raw !== undefined && message.raw !== null
      ? JSON.stringify(message.raw)
      : '';

  const req: ProtoMessage = {
    sender: message.metadata.sender_node_id,
    recipient: message.metadata.recipient_node_id ?? '',
    type: message.metadata.type ?? '',
    payload,
    timestamp: message.metadata.timestamp,
  };

  const svc = client as grpc.Client & { SendMessage?: UnaryMethod; sendMessage?: UnaryMethod };
  const fn = svc.SendMessage ?? svc.sendMessage;
  if (!fn) {
    client.close();
    return Promise.reject(new GrpcTransportError(GrpcTransportErrorCode.SEND_FAILED, 'SendMessage not found'));
  }

  return new Promise((resolve, reject) => {
    const deadline = options?.timeoutMs != null ? Date.now() + options.timeoutMs : undefined;
    const callOptions: grpc.CallOptions = deadline != null ? { deadline } : {};
    fn.call(client, req, callOptions, (err, res) => {
      client.close();
      if (err) {
        const code =
          err.code === grpc.status.UNAVAILABLE
            ? GrpcTransportErrorCode.CONNECTION_FAILED
            : GrpcTransportErrorCode.SEND_FAILED;
        return reject(new GrpcTransportError(code, err.message));
      }
      if (res?.success !== true) {
        return reject(new GrpcTransportError(GrpcTransportErrorCode.SEND_FAILED, 'Ack success false'));
      }
      resolve();
    });
  });
}
