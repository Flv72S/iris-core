import fs from 'node:fs';
import path from 'node:path';

export type LogFileType = 'runtime' | 'audit';

export type RotationConfig = {
  logDir?: string;
  archiveDir?: string;
  maxBytes?: number;
  maxAgeMs?: number;
  now?: () => Date;
};

export type RotationResult = {
  rotated: boolean;
  archivedPath?: string;
};

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function defaultLogDir(): string {
  return path.resolve(process.cwd(), 'artifacts/logs');
}

function resolveArchiveDir(cfg: RotationConfig): string {
  return cfg.archiveDir ?? path.join(cfg.logDir ?? defaultLogDir(), 'archive');
}

function resolveActivePath(type: LogFileType, cfg: RotationConfig): string {
  const logDir = cfg.logDir ?? defaultLogDir();
  const name = type === 'runtime' ? 'runtime.log.jsonl' : 'audit.log.jsonl';
  return path.join(logDir, name);
}

function formatRotationStamp(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(
    date.getUTCMinutes(),
  )}${pad(date.getUTCSeconds())}`;
}

function nextArchivePath(type: LogFileType, stamp: string, archiveDir: string): string {
  const base = `${type}-${stamp}`;
  let index = 0;
  while (true) {
    const suffix = index === 0 ? '' : `-${index}`;
    const candidate = path.join(archiveDir, `${base}${suffix}.jsonl`);
    if (!fs.existsSync(candidate)) return candidate;
    index += 1;
  }
}

function fsyncExistingFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const fd = fs.openSync(filePath, 'a+');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function createDurableEmptyFile(filePath: string): void {
  const fd = fs.openSync(filePath, 'w');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

export function rotateIfNeeded(type: LogFileType, cfg: RotationConfig = {}): RotationResult {
  const now = (cfg.now ?? (() => new Date()))();
  const maxBytes = cfg.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxAgeMs = cfg.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const logDir = cfg.logDir ?? defaultLogDir();
  const archiveDir = resolveArchiveDir({ ...cfg, logDir });
  const activePath = resolveActivePath(type, { ...cfg, logDir });

  fs.mkdirSync(logDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  if (!fs.existsSync(activePath)) {
    createDurableEmptyFile(activePath);
    return { rotated: false };
  }

  const stat = fs.statSync(activePath);
  const bySize = stat.size > maxBytes;
  const byAge = now.getTime() - stat.mtimeMs > maxAgeMs;
  if (!bySize && !byAge) {
    return { rotated: false };
  }

  const archivePath = nextArchivePath(type, formatRotationStamp(now), archiveDir);
  fsyncExistingFile(activePath);
  fs.renameSync(activePath, archivePath);
  createDurableEmptyFile(activePath);
  return { rotated: true, archivedPath: archivePath };
}

