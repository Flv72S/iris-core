import http from 'node:http';
import net from 'node:net';

import { trackHandle, untrackHandle } from '../utils/open_handle_tracker.js';

type PatchedGlobals = typeof globalThis & {
  __irisOpenHandlePatched?: boolean;
};
type TimerCallback = (...args: unknown[]) => void;

const g = globalThis as PatchedGlobals;

if (!g.__irisOpenHandlePatched) {
  g.__irisOpenHandlePatched = true;

  const _setTimeout = globalThis.setTimeout.bind(globalThis);
  const _clearTimeout = globalThis.clearTimeout.bind(globalThis);
  const _setInterval = globalThis.setInterval.bind(globalThis);
  const _clearInterval = globalThis.clearInterval.bind(globalThis);
  const _setImmediate = globalThis.setImmediate.bind(globalThis);
  const _clearImmediate = globalThis.clearImmediate.bind(globalThis);

  globalThis.setTimeout = ((handler: TimerCallback, timeout?: number, ...args: unknown[]) => {
    const t = _setTimeout(handler, timeout, ...args);
    trackHandle('timeout', t);
    return t;
  }) as typeof globalThis.setTimeout;

  globalThis.clearTimeout = ((timeoutId: NodeJS.Timeout | string | number | undefined) => {
    if (timeoutId !== undefined) untrackHandle(timeoutId);
    return _clearTimeout(timeoutId);
  }) as typeof globalThis.clearTimeout;

  globalThis.setInterval = ((handler: TimerCallback, timeout?: number, ...args: unknown[]) => {
    const t = _setInterval(handler, timeout, ...args);
    trackHandle('interval', t);
    return t;
  }) as typeof globalThis.setInterval;

  globalThis.clearInterval = ((intervalId: NodeJS.Timeout | string | number | undefined) => {
    if (intervalId !== undefined) untrackHandle(intervalId);
    return _clearInterval(intervalId);
  }) as typeof globalThis.clearInterval;

  globalThis.setImmediate = ((callback: (...args: unknown[]) => void, ...args: unknown[]) => {
    const i = _setImmediate(callback, ...args);
    trackHandle('immediate', i);
    return i;
  }) as typeof globalThis.setImmediate;

  globalThis.clearImmediate = ((immediateId: NodeJS.Immediate | undefined) => {
    if (immediateId !== undefined) untrackHandle(immediateId);
    return _clearImmediate(immediateId);
  }) as typeof globalThis.clearImmediate;

  const originalCreateServer = http.createServer.bind(http);
  http.createServer = ((...args: Parameters<typeof http.createServer>) => {
    const server = originalCreateServer(...args);
    trackHandle('server', server);
    const originalClose = server.close.bind(server);
    server.close = ((cb?: (err?: Error) => void) => {
      return originalClose((err?: Error) => {
        untrackHandle(server);
        cb?.(err);
      });
    }) as typeof server.close;
    return server;
  }) as typeof http.createServer;

  const originalListen = net.Server.prototype.listen;
  net.Server.prototype.listen = function patchedListen(...args: any[]) {
    trackHandle('server', this);
    return originalListen.apply(this, args as never);
  };

  const originalDestroy = net.Socket.prototype.destroy;
  net.Socket.prototype.destroy = function patchedDestroy(...args: any[]) {
    untrackHandle(this);
    return originalDestroy.apply(this, args as never);
  };

  const originalConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function patchedConnect(...args: any[]) {
    trackHandle('socket', this);
    return originalConnect.apply(this, args as never);
  };
}
