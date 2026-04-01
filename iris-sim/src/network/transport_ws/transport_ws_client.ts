/**
 * Microstep 15E.2 — WebSocket/P2P Transport. Client connector.
 * Microstep 16D — Deterministic shutdown (terminate, timer cleanup, idempotent).
 */

import WebSocket from 'ws';
import { WsTransportError, WsTransportErrorCode } from './transport_ws_errors.js';
import type { WsPeer, WsWireMessage } from './transport_ws_types.js';

export interface WsClientHandle {
  /** Current socket; `undefined` after {@link shutdown} / {@link close}. */
  readonly socket: WebSocket | undefined;
  close(): void;
  shutdown(): Promise<void>;
}

export function connectWsPeer(args: {
  local_node_id: string;
  peer: WsPeer;
  onWireMessage: (wire: WsWireMessage) => void;
  onOpen: (socket: WebSocket) => void;
  onClose: () => void;
  reconnect?: boolean;
}): WsClientHandle {
  let stopped = false;
  let done = false;
  let backoffMs = 100;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatInterval: ReturnType<typeof setInterval> | undefined;
  const initialWs = new WebSocket(args.peer.url);
  let currentWs: WebSocket | undefined = initialWs;

  const clearTimers = (): void => {
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
    if (heartbeatInterval !== undefined) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = undefined;
    }
  };

  const shutdownInternal = async (): Promise<void> => {
    if (done) return;
    done = true;
    stopped = true;
    clearTimers();
    const ws = currentWs;
    currentWs = undefined;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.CONNECTING) {
          // In CONNECTING state, terminate() can emit async error outside try/catch.
          ws.on('error', () => {});
          ws.close();
        } else {
          ws.terminate();
        }
      } catch {
        // forced close — ignore
      }
      await new Promise<void>((r) => setImmediate(r));
      try {
        ws.removeAllListeners();
      } catch {
        // best effort listener cleanup
      }
    }
    await new Promise<void>((r) => setImmediate(r));
  };

  const attach = (ws: WebSocket): void => {
    ws.on('open', () => {
      backoffMs = 100;
      args.onOpen(ws);
      const hello: WsWireMessage = {
        raw: JSON.stringify({ kind: 'hello' }),
        metadata: {
          sender: args.local_node_id,
          recipient: args.peer.node_id,
          timestamp: Date.now(),
          type: '__peer_hello__',
        },
      };
      ws.send(JSON.stringify(hello));
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as WsWireMessage;
        args.onWireMessage(parsed);
      } catch {
        // ignore malformed incoming frames at client connector level
      }
    });

    ws.on('close', () => {
      args.onClose();
      if (!stopped && args.reconnect !== false) {
        reconnectTimer = setTimeout(() => {
          if (stopped) return;
          const nw = new WebSocket(args.peer.url);
          currentWs = nw;
          attach(nw);
          backoffMs = Math.min(backoffMs * 2, 2_000);
        }, backoffMs);
        if (typeof reconnectTimer.unref === 'function') reconnectTimer.unref();
      }
    });

    ws.on('error', () => {
      // reconnect flow is handled by close
    });
  };

  attach(initialWs);

  return {
    get socket() {
      return currentWs;
    },
    close() {
      void shutdownInternal();
    },
    shutdown() {
      return shutdownInternal();
    },
  };
}

export function sendWsWireMessage(socket: WebSocket, wire: WsWireMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.readyState !== WebSocket.OPEN) {
      reject(new WsTransportError(WsTransportErrorCode.CONNECTION_FAILED, 'WebSocket is not open'));
      return;
    }
    try {
      // In ws, the callback behavior can vary; resolve after enqueueing to avoid hanging tests.
      socket.send(JSON.stringify(wire));
      resolve();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      reject(new WsTransportError(WsTransportErrorCode.SEND_FAILED, msg));
    }
  });
}
