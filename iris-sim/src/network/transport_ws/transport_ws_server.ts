/**
 * Microstep 15E.2 — WebSocket/P2P Transport. Server.
 */

import WebSocket, { WebSocketServer } from 'ws';
import type { WsTransportConfig, WsWireMessage } from './transport_ws_types.js';
import { WsTransportError, WsTransportErrorCode } from './transport_ws_errors.js';

function isWireMessage(v: unknown): v is WsWireMessage {
  if (v == null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const m = o.metadata as Record<string, unknown> | undefined;
  return (
    typeof o.raw === 'string' &&
    m != null &&
    typeof m.sender === 'string' &&
    (m.recipient == null || typeof m.recipient === 'string') &&
    typeof m.timestamp === 'number' &&
    (m.type == null || typeof m.type === 'string')
  );
}

export interface WsServerHandle {
  readonly server: WebSocketServer;
  stop(): Promise<void>;
}

export function startWsServer(args: {
  config: WsTransportConfig;
  onConnection: (socket: WebSocket) => void;
  onDisconnect: (socket: WebSocket) => void;
  onWireMessage: (socket: WebSocket, wire: WsWireMessage) => void;
}): Promise<WsServerHandle> {
  return new Promise((resolve, reject) => {
    const server = new WebSocketServer({
      port: args.config.port,
      host: args.config.host ?? '127.0.0.1',
    });

    server.on('connection', (socket) => {
      args.onConnection(socket);
      socket.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString()) as unknown;
          if (!isWireMessage(parsed)) {
            return;
          }
          args.onWireMessage(socket, parsed);
        } catch {
          // invalid JSON frame, ignore
        }
      });
      socket.on('close', () => args.onDisconnect(socket));
    });

    server.on('listening', () => {
      resolve({
        server,
        stop: async () => {
          const snapshot = [...server.clients];
          // Do not call removeAllListeners() on server sockets: `ws` registers `close`
          // to delete the socket from `server.clients`; stripping listeners breaks that.
          await Promise.all(
            snapshot.map(
              (client) =>
                new Promise<void>((resolve) => {
                  try {
                    if (client.readyState === WebSocket.CLOSED) {
                      resolve();
                      return;
                    }
                  } catch {
                    resolve();
                    return;
                  }
                  client.once('close', () => resolve());
                  try {
                    client.terminate();
                  } catch {
                    resolve();
                  }
                }),
            ),
          );

          await new Promise<void>((res, rej) => {
            server.close((err) => {
              try {
                server.removeAllListeners();
              } catch {
                // ignore
              }
              if (err) rej(err);
              else res();
            });
          });
        },
      });
    });
    server.on('error', (err) => {
      reject(new WsTransportError(WsTransportErrorCode.CONNECTION_FAILED, err.message));
    });
  });
}

