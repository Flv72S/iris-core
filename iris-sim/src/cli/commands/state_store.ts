import fs from 'node:fs';
import path from 'node:path';

import { observabilitySnapshotPath as observabilitySnapshotPathFromPersist } from '../../observability/observability_persist.js';

export type IrisStateFile = {
  pid: number;
  node_id: string;
  started_at: number;
  status: 'running' | 'stopped';
  port: number;
  log_file: string;
};

export function irisDir(cwd: string): string {
  const dir = path.join(cwd, '.iris');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function statePath(cwd: string): string {
  return path.join(irisDir(cwd), 'iris.state.json');
}

export function logPath(cwd: string): string {
  return path.join(irisDir(cwd), 'iris.log');
}

export function metricsPath(cwd: string): string {
  return path.join(irisDir(cwd), 'metrics.json');
}

/** Phase 16E.X2 — persisted IRIS spans for `iris traces` (legacy; prefer observability snapshot). */
export function tracesPath(cwd: string): string {
  return path.join(irisDir(cwd), 'traces.json');
}

/** Microstep 16E.FINAL — unified observability snapshot (single source of truth). */
export const observabilitySnapshotPath = observabilitySnapshotPathFromPersist;

export function pidPath(cwd: string): string {
  return path.join(irisDir(cwd), 'iris.pid');
}

export function writeState(cwd: string, state: IrisStateFile): void {
  fs.writeFileSync(statePath(cwd), JSON.stringify(state, null, 2), 'utf8');
}

export function writePid(cwd: string, pid: number): void {
  fs.writeFileSync(pidPath(cwd), String(pid), 'utf8');
}

export function readPid(cwd: string): number | null {
  const p = pidPath(cwd);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8').trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function removePid(cwd: string): void {
  const p = pidPath(cwd);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

export function readState(cwd: string): IrisStateFile | null {
  const p = statePath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as IrisStateFile;
  } catch {
    return null;
  }
}

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

