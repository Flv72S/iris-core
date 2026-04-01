export type HandleType =
  | 'timeout'
  | 'interval'
  | 'immediate'
  | 'server'
  | 'socket'
  | 'custom'
  | 'websocket'
  | 'wsserver';

export interface TrackedHandle {
  type: HandleType;
  ref: unknown;
  createdAt: number;
  stack?: string;
}

const trackedByRef = new Map<unknown, TrackedHandle>();

const isDebug = process.env.IRIS_DEBUG_HANDLES === '1';

function isObjectLike(value: unknown): boolean {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function captureStack(): string | undefined {
  const err = new Error('tracked handle');
  return err.stack;
}

export function trackHandle(type: HandleType, ref: unknown): void {
  if (!isObjectLike(ref)) return;
  if (trackedByRef.has(ref)) return;
  const stack = captureStack();
  trackedByRef.set(ref, {
    type,
    ref,
    createdAt: Date.now(),
    ...(stack !== undefined ? { stack } : {}),
  });
}

export function untrackHandle(ref: unknown): void {
  if (!isObjectLike(ref)) return;
  trackedByRef.delete(ref);
}

export function getOpenHandles(): TrackedHandle[] {
  return [...trackedByRef.values()];
}

/** Human-readable line for logs (includes WebSocket readyState when applicable). */
export function describeHandle(h: TrackedHandle): string {
  const r = h.ref as {
    readyState?: number;
    constructor?: { name?: string };
    listening?: boolean;
  };
  let extra = '';
  if (r && typeof r.readyState === 'number') {
    const name = r.constructor?.name ?? '';
    if (name === 'WebSocket' || name === 'WebSocketServer') {
      extra = ` readyState=${r.readyState}`;
    }
  }
  if (r && typeof r.listening === 'boolean' && h.type === 'server') {
    extra += ` listening=${r.listening}`;
  }
  return `${h.type}@${h.createdAt}${extra}`;
}

async function closeServer(server: unknown): Promise<void> {
  if (!server || typeof server !== 'object') return;
  const srv = server as { close?: (cb?: (err?: Error) => void) => void; listening?: boolean };
  if (typeof srv.close !== 'function') return;
  const close = srv.close;
  if (srv.listening === false) return;
  await new Promise<void>((resolve) => {
    try {
      close(() => resolve());
    } catch {
      resolve();
    }
  });
}

function destroyWebSocketLike(socket: unknown): void {
  if (!socket || typeof socket !== 'object') return;
  const s = socket as { removeAllListeners?: () => void; terminate?: () => void; readyState?: number };
  if (typeof s.terminate !== 'function' || typeof s.readyState !== 'number') return;
  try {
    s.removeAllListeners?.();
    s.terminate();
  } catch {
    // best effort
  }
}

function destroySocket(socket: unknown): void {
  if (!socket || typeof socket !== 'object') return;
  const s = socket as {
    destroy?: () => void;
    terminate?: () => void;
    removeAllListeners?: () => void;
    readyState?: number;
  };
  if (typeof s.terminate === 'function' && typeof s.readyState === 'number') {
    destroyWebSocketLike(socket);
    return;
  }
  if (typeof s.destroy !== 'function') return;
  try {
    s.destroy();
  } catch {
    // best effort
  }
}

function clearTimer(ref: unknown, type: HandleType): void {
  try {
    if (type === 'interval') clearInterval(ref as NodeJS.Timeout);
    else if (type === 'immediate') clearImmediate(ref as NodeJS.Immediate);
    else clearTimeout(ref as NodeJS.Timeout);
  } catch {
    // best effort
  }
}

/** Throws if any tracked or process WebSocket is still OPEN (1) or CLOSING (2). */
export function assertNoActiveWebSocketHandles(): void {
  for (const h of getOpenHandles()) {
    const r = h.ref as { readyState?: number; constructor?: { name?: string } };
    if (r && typeof r.readyState === 'number' && r.constructor?.name === 'WebSocket') {
      if (r.readyState === 1 || r.readyState === 2) {
        throw new Error(`WS handles still active after teardown (${describeHandle(h)})`);
      }
    }
  }
  const proc = process as NodeJS.Process & { _getActiveHandles?: () => unknown[] };
  if (typeof proc._getActiveHandles === 'function') {
    for (const h of proc._getActiveHandles() ?? []) {
      const r = h as { readyState?: number; constructor?: { name?: string } };
      if (r && typeof r.readyState === 'number' && r.constructor?.name === 'WebSocket') {
        if (r.readyState === 1 || r.readyState === 2) {
          throw new Error('WS handles still active after teardown (process active handle)');
        }
      }
    }
  }
}

export function assertNoOpenHandles(): void {
  const handles = getOpenHandles();
  if (handles.length > 0) {
    throw new Error(`OPEN HANDLES DETECTED AFTER TEST RUN:

${handles.map(describeHandle).join('\n')}`);
  }
}

export async function cleanupOpenHandles(): Promise<void> {
  const handles = getOpenHandles();
  for (const h of handles) {
    if (h.type === 'timeout' || h.type === 'interval' || h.type === 'immediate') {
      clearTimer(h.ref, h.type);
      untrackHandle(h.ref);
      continue;
    }
    if (h.type === 'server') {
      await closeServer(h.ref);
      untrackHandle(h.ref);
      continue;
    }
    if (h.type === 'socket' || h.type === 'websocket' || h.type === 'wsserver') {
      destroySocket(h.ref);
      untrackHandle(h.ref);
      continue;
    }
    untrackHandle(h.ref);
  }

  if (isDebug) {
    const proc = process as NodeJS.Process & {
      _getActiveHandles?: () => unknown[];
      _getActiveRequests?: () => unknown[];
    };
    if (typeof proc._getActiveHandles === 'function') {
      console.log('[IRIS TEST] active handles:', proc._getActiveHandles());
    }
    if (typeof proc._getActiveRequests === 'function') {
      console.log('[IRIS TEST] active requests:', proc._getActiveRequests());
    }
  }
}
