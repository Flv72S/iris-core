import fs from 'node:fs';
import path from 'node:path';

import { rebuildLogIndex, type LogIndexerConfig } from './indexer';

export type RetentionConfig = LogIndexerConfig & {
  retentionMs?: number;
};

export type RetentionResult = {
  deleted: string[];
};

const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function defaultLogDir(): string {
  return path.resolve(process.cwd(), 'artifacts/logs');
}

function resolveArchiveDir(cfg: RetentionConfig): string {
  return cfg.archiveDir ?? path.join(cfg.logDir ?? defaultLogDir(), 'archive');
}

export function enforceRetention(cfg: RetentionConfig = {}): RetentionResult {
  const now = (cfg.now ?? (() => new Date()))();
  const retentionMs = cfg.retentionMs ?? DEFAULT_RETENTION_MS;
  const archiveDir = resolveArchiveDir(cfg);
  fs.mkdirSync(archiveDir, { recursive: true });

  const deleted: string[] = [];
  const names = fs.readdirSync(archiveDir).filter((name) => name.endsWith('.jsonl')).sort();
  for (const name of names) {
    const abs = path.join(archiveDir, name);
    const stat = fs.statSync(abs);
    if (now.getTime() - stat.mtimeMs > retentionMs) {
      fs.unlinkSync(abs);
      deleted.push(abs);
    }
  }

  // Index must reflect archive state after retention.
  rebuildLogIndex(cfg);
  return { deleted };
}

