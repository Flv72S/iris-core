/**
 * Microstep 16D — Atomic persistence of cluster snapshot under `.iris/`.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { ControlPlaneSnapshot } from './control_plane_types.js';

export const CONTROL_PLANE_SNAPSHOT_FILENAME = 'control_plane.snapshot.json';

export function controlPlaneSnapshotPath(cwd: string): string {
  return path.join(cwd, '.iris', CONTROL_PLANE_SNAPSHOT_FILENAME);
}

function sortRecord<T extends Record<string, unknown>>(obj: T): T {
  const keys = Object.keys(obj).sort() as (keyof T)[];
  const out = {} as T;
  for (const k of keys) {
    out[k] = obj[k];
  }
  return out;
}

/** Deterministic JSON-friendly representation (sorted keys recursively where needed). */
export function sanitizeClusterSnapshotForJson(s: ControlPlaneSnapshot): Record<string, unknown> {
  const cluster = sortRecord({
    degradedNodes: s.cluster.degradedNodes,
    healthyNodes: s.cluster.healthyNodes,
    nodeCount: s.cluster.nodeCount,
    timestamp: s.cluster.timestamp,
  } as Record<string, unknown>);

  const nodeKeys = Object.keys(s.nodes).sort();
  const nodes: Record<string, unknown> = {};
  for (const id of nodeKeys) {
    const n = s.nodes[id]!;
    const info = sortRecord({
      lastSeen: n.info.lastSeen,
      nodeId: n.info.nodeId,
      status: n.info.status,
      trustState: n.info.trustState,
      activeSecret: n.info.activeSecret,
      createdAt: n.info.createdAt,
      ...(n.info.nextSecret !== undefined ? { nextSecret: n.info.nextSecret } : {}),
      ...(n.info.rotatedAt !== undefined ? { rotatedAt: n.info.rotatedAt } : {}),
      ...(n.info.revokedAt !== undefined ? { revokedAt: n.info.revokedAt } : {}),
      ...(n.info.metadata !== undefined ? { metadata: sortRecord(n.info.metadata as Record<string, unknown>) } : {}),
    } as Record<string, unknown>);
    const obs = n.observability as unknown as Record<string, unknown>;
    nodes[id] = sortRecord({
      info,
      observability: obs,
    } as Record<string, unknown>);
  }

  return sortRecord({
    cluster,
    nodes: sortRecord(nodes as Record<string, unknown>),
  } as Record<string, unknown>);
}

export function writeControlPlaneSnapshot(cwd: string, snapshot: ControlPlaneSnapshot): void {
  const p = controlPlaneSnapshotPath(cwd);
  const tmp = `${p}.tmp`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const payload = sanitizeClusterSnapshotForJson(snapshot);
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, p);
}

export function readControlPlaneSnapshot(cwd: string): ControlPlaneSnapshot | null {
  const p = controlPlaneSnapshotPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as ControlPlaneSnapshot;
  } catch {
    return null;
  }
}
