import fs from 'node:fs';
import path from 'node:path';

import { stableStringify } from '../../security/stable_json.js';
import type { TrustSnapshot } from './trust_snapshot.js';
import { computeTrustSnapshotHash, normalizeTrustSnapshot } from './trust_snapshot.js';
import type { TrustLifecycleEvent } from './trust_lifecycle_events.js';

export const TRUST_SNAPSHOT_FILENAME = 'trust_snapshot.json';
export const TRUST_EVENTS_FILENAME = 'trust_events.log';

function irisDir(cwd: string): string {
  const dir = path.join(cwd, '.iris');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function trustSnapshotPath(cwd: string): string {
  return path.join(irisDir(cwd), TRUST_SNAPSHOT_FILENAME);
}

export function trustEventsPath(cwd: string): string {
  return path.join(irisDir(cwd), TRUST_EVENTS_FILENAME);
}

export function writeTrustSnapshot(cwd: string, snapshot: TrustSnapshot): void {
  const p = trustSnapshotPath(cwd);
  const tmp = `${p}.tmp`;
  const normalized = normalizeTrustSnapshot(snapshot);
  const json = `${stableStringify(normalized)}\n`;
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, p);
}

export function readTrustSnapshot(cwd: string): TrustSnapshot | null {
  const p = trustSnapshotPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as TrustSnapshot;
  } catch {
    return null;
  }
}

export function appendTrustEvent(cwd: string, event: TrustLifecycleEvent): void {
  const p = trustEventsPath(cwd);
  const line = `${stableStringify(event)}\n`;
  fs.appendFileSync(p, line, 'utf8');
}

export function readTrustEvents(cwd: string, opts?: { maxLines?: number }): TrustLifecycleEvent[] {
  const p = trustEventsPath(cwd);
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const capped = typeof opts?.maxLines === 'number' ? lines.slice(-opts.maxLines) : lines;
  const out: TrustLifecycleEvent[] = [];
  for (const line of capped) {
    try {
      out.push(JSON.parse(line) as TrustLifecycleEvent);
    } catch {
      // ignore malformed lines (append-only log may contain partial writes in crash scenarios)
    }
  }
  return out;
}

export function computeTrustSnapshotDrift(cwd: string, snapshot: TrustSnapshot): { driftDetected: boolean; localHash?: string; snapshotHash: string } {
  const snapshotHash = computeTrustSnapshotHash(snapshot);
  const local = readTrustSnapshot(cwd);
  if (!local) return { driftDetected: false, snapshotHash };
  const localHash = computeTrustSnapshotHash(local);
  return { driftDetected: localHash !== snapshotHash, localHash, snapshotHash };
}

