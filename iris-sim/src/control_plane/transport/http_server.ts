/**
 * Microstep 16D — Minimal HTTP transport for control plane (JSON in/out).
 */

import http from 'node:http';

import type { ControlPlane } from '../control_plane.js';
import { verifyIngestRequestAuth } from '../control_plane_ingest_auth.js';
import { sanitizeClusterSnapshotForJson } from '../control_plane_persist.js';
import { securityLog } from '../../security/security_logger.js';

function sortRecord<T extends Record<string, unknown>>(obj: T): T {
  const keys = Object.keys(obj).sort() as (keyof T)[];
  const out = {} as T;
  for (const k of keys) {
    out[k] = obj[k];
  }
  return out;
}

export type ControlPlaneHttpServerOptions = {
  controlPlane: ControlPlane;
  port?: number;
  host?: string;
};

export type ControlPlaneHttpServerHandle = {
  server: http.Server;
  port: number;
  close: () => Promise<void>;
};

function jsonResponse(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = `${JSON.stringify(body, null, 2)}\n`;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(payload);
}

function flattenHeaders(h: http.IncomingHttpHeaders): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

function parsePath(pathname: string): { name: string; nodeId?: string } {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] === 'ingest' && parts.length === 1) return { name: 'ingest' };
  if (parts[0] === 'cluster' && parts.length === 1) return { name: 'cluster' };
  if (parts[0] === 'nodes' && parts.length === 1) return { name: 'nodes' };
  if (parts[0] === 'nodes' && parts.length === 2) return { name: 'node', nodeId: parts[1] };
  if (parts[0] === 'nodes' && parts.length === 3 && parts[2] === 'activate') return { name: 'node_activate', nodeId: parts[1] };
  if (parts[0] === 'nodes' && parts.length === 3 && parts[2] === 'revoke') return { name: 'node_revoke', nodeId: parts[1] };
  if (parts[0] === 'nodes' && parts.length === 3 && parts[2] === 'rotate') return { name: 'node_rotate', nodeId: parts[1] };
  if (parts[0] === 'nodes' && parts.length === 4 && parts[2] === 'rotation' && parts[3] === 'complete') {
    return { name: 'node_rotation_complete', nodeId: parts[1] };
  }
  return { name: 'unknown' };
}

export function createControlPlaneHttpServer(
  opts: ControlPlaneHttpServerOptions,
): http.Server {
  const cp = opts.controlPlane;

  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const route = parsePath(url.pathname);

    if (req.method === 'POST' && route.name === 'ingest') {
      let raw = '';
      let totalBytes = 0;
      let tooLarge = false;
      req.on('data', (c) => {
        if (tooLarge) return;
        totalBytes += Buffer.isBuffer(c) ? c.length : Buffer.byteLength(String(c), 'utf8');
        if (totalBytes > cp.maxIngestBytes) {
          tooLarge = true;
          securityLog('PAYLOAD_TOO_LARGE', { bytes: totalBytes });
          jsonResponse(res, 413, { ok: false, error: 'PAYLOAD_TOO_LARGE' });
          req.destroy();
          return;
        }
        raw += c;
      });
      req.on('end', () => {
        if (tooLarge) return;
        try {
          const parsed = JSON.parse(raw) as { nodeId?: string; snapshot?: unknown };
          if (typeof parsed.nodeId !== 'string' || parsed.snapshot == null || typeof parsed.snapshot !== 'object') {
            jsonResponse(res, 400, { ok: false, error: 'invalid body' });
            return;
          }
          const flat = flattenHeaders(req.headers);
          const auth = verifyIngestRequestAuth({
            requireSignedIngest: cp.requireSignedIngest,
            now: cp.nowMs(),
            headers: flat,
            parsedBody: { nodeId: parsed.nodeId, snapshot: parsed.snapshot },
            getNodeAuth: (id) => cp.registry.getNodeAuth(id),
            expireRotation: (id) => cp.registry.expireRotation(id),
            nonceStore: cp.nonceStore,
          });
          if (!auth.ok) {
            jsonResponse(res, auth.status, { ok: false, error: auth.error });
            return;
          }
          if (auth.mode === 'unsigned_dev') {
            console.warn(`[IRIS] UNSECURED NODE INGEST nodeId=${parsed.nodeId}`);
          }
          const result = cp.ingestSnapshot(parsed.nodeId, parsed.snapshot as any);
          if (!result.ok) {
            jsonResponse(res, 400, { ok: false, error: result.error });
            return;
          }
          jsonResponse(res, 200, { ok: true });
        } catch {
          jsonResponse(res, 400, { ok: false, error: 'invalid body' });
        }
      });
      req.on('error', () => {
        if (tooLarge) return;
        jsonResponse(res, 400, { ok: false, error: 'read error' });
      });
      return;
    }

    if (req.method === 'POST' && route.name === 'node_activate' && route.nodeId) {
      const ok = cp.activateNode(route.nodeId);
      if (!ok) {
        jsonResponse(res, 400, { ok: false, error: 'cannot activate node' });
        return;
      }
      jsonResponse(res, 200, { ok: true, nodeId: route.nodeId });
      return;
    }

    if (req.method === 'POST' && route.name === 'node_revoke' && route.nodeId) {
      const ok = cp.revokeNode(route.nodeId);
      if (!ok) {
        jsonResponse(res, 400, { ok: false, error: 'cannot revoke node' });
        return;
      }
      jsonResponse(res, 200, { ok: true, nodeId: route.nodeId });
      return;
    }

    if (req.method === 'POST' && route.name === 'node_rotate' && route.nodeId) {
      const result = cp.initiateRotationWithDelivery(route.nodeId);
      if (!result.ok) {
        if (result.status === 409) {
          jsonResponse(res, 409, { ok: false, error: 'Rotation secret already delivered' });
          return;
        }
        jsonResponse(res, 400, { ok: false, error: 'cannot start rotation' });
        return;
      }
      jsonResponse(res, 200, { ok: true, nodeId: route.nodeId, nextSecret: result.nextSecret });
      return;
    }

    if (req.method === 'POST' && route.name === 'node_rotation_complete' && route.nodeId) {
      const ok = cp.finalizeRotation(route.nodeId);
      if (!ok) {
        jsonResponse(res, 400, { ok: false, error: 'cannot complete rotation' });
        return;
      }
      jsonResponse(res, 200, { ok: true, nodeId: route.nodeId });
      return;
    }

    if (req.method === 'GET' && route.name === 'cluster') {
      const snap = cp.getClusterSnapshot();
      jsonResponse(
        res,
        200,
        sortRecord({
          degradedNodes: snap.cluster.degradedNodes,
          healthyNodes: snap.cluster.healthyNodes,
          nodeCount: snap.cluster.nodeCount,
          timestamp: snap.cluster.timestamp,
        } as Record<string, unknown>),
      );
      return;
    }

    if (req.method === 'GET' && route.name === 'nodes') {
      const snap = cp.getClusterSnapshot();
      const sanitized = sanitizeClusterSnapshotForJson(snap);
      const nodes = (sanitized as { nodes?: unknown }).nodes ?? {};
      jsonResponse(res, 200, { nodes });
      return;
    }

    if (req.method === 'GET' && route.name === 'node' && route.nodeId) {
      const n = cp.getNode(route.nodeId);
      if (!n) {
        jsonResponse(res, 404, { ok: false, error: 'not found' });
        return;
      }
      jsonResponse(res, 200, {
        info: n.info,
        observability: n.observability,
      });
      return;
    }

    jsonResponse(res, 404, { ok: false, error: 'not found' });
  });
}

export async function listenControlPlaneHttpServer(
  opts: ControlPlaneHttpServerOptions,
): Promise<ControlPlaneHttpServerHandle> {
  const server = createControlPlaneHttpServer(opts);
  const port = opts.port ?? 9470;
  const host = opts.host ?? '127.0.0.1';
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });
  const addr = server.address();
  const actualPort = addr && typeof addr === 'object' ? addr.port : port;
  const handle: ControlPlaneHttpServerHandle = {
    server,
    port: actualPort,
    close: () =>
      new Promise<void>((resolve, reject) => {
        if (!server.listening) return resolve();
        server.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      }),
  };
  opts.controlPlane.attachHttpServer(handle);
  return handle;
}
