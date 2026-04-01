import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { InvariantId, LogEntry } from './types';
import type { LogFileType } from './rotation';
import { compareLogEntriesForAudit } from './stableAudit';
import { validateLogEntry } from './validator';

export type ReplayFilters = {
  startTime?: string;
  endTime?: string;
  invariantIds?: InvariantId[];
  nondeterministicOnly?: boolean;
  /** When set, only entries with this `runtimeId` are included (16F.5 SDK replay). */
  runtimeId?: string;
};

export class ReplayIndexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReplayIndexError';
  }
}

export type LogIndexerConfig = {
  logDir?: string;
  archiveDir?: string;
  indexPath?: string;
  now?: () => Date;
};

export type IndexedLogFile = {
  sequence: number;
  name: string;
  type: LogFileType;
  startTimestamp: string;
  endTimestamp: string;
  entries: number;
  hash: string;
  prevHash: string | null;
  path: string;
};

export type LogIndex = {
  version: '1.0';
  generatedAt: string;
  files: IndexedLogFile[];
};

export type LogReplayValidation = {
  valid: boolean;
  errors: string[];
};

function defaultLogDir(): string {
  return path.resolve(process.cwd(), 'artifacts/logs');
}

function resolveArchiveDir(cfg: LogIndexerConfig): string {
  return cfg.archiveDir ?? path.join(cfg.logDir ?? defaultLogDir(), 'archive');
}

function resolveIndexPath(cfg: LogIndexerConfig): string {
  return cfg.indexPath ?? path.join(cfg.logDir ?? defaultLogDir(), 'index.json');
}

function inferType(fileName: string): LogFileType {
  return fileName.startsWith('audit-') ? 'audit' : 'runtime';
}

function hashContent(content: string): string {
  const digest = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  return `sha256-${digest}`;
}

function parseTimestamps(lines: string[]): { startTimestamp: string; endTimestamp: string } {
  const timestamps: string[] = [];
  for (const line of lines) {
    const parsed = JSON.parse(line) as { timestamp?: unknown };
    if (typeof parsed.timestamp === 'string') {
      timestamps.push(parsed.timestamp);
    }
  }
  if (timestamps.length === 0) {
    return { startTimestamp: '', endTimestamp: '' };
  }
  const sorted = [...timestamps].sort();
  return { startTimestamp: sorted[0]!, endTimestamp: sorted[sorted.length - 1]! };
}

function toPortablePath(absPath: string): string {
  return absPath.split(path.sep).join('/');
}

export function buildLogIndex(cfg: LogIndexerConfig = {}): LogIndex {
  const now = (cfg.now ?? ((): Date => new Date()))();
  const archiveDir = resolveArchiveDir(cfg);
  fs.mkdirSync(archiveDir, { recursive: true });
  const fileNames = fs
    .readdirSync(archiveDir)
    .filter((name) => name.endsWith('.jsonl'))
    .sort();

  const files: IndexedLogFile[] = [];
  let previousHash: string | null = null;
  for (const name of fileNames) {
    const abs = path.join(archiveDir, name);
    const content = fs.readFileSync(abs, 'utf8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const range = parseTimestamps(lines);
    const hash = hashContent(content);
    files.push({
      sequence: files.length + 1,
      name,
      type: inferType(name),
      startTimestamp: range.startTimestamp,
      endTimestamp: range.endTimestamp,
      entries: lines.length,
      hash,
      prevHash: previousHash,
      path: toPortablePath(path.relative(process.cwd(), abs)),
    });
    previousHash = hash;
  }

  return {
    version: '1.0',
    generatedAt: now.toISOString(),
    files,
  };
}

export function writeLogIndex(index: LogIndex, cfg: LogIndexerConfig = {}): void {
  const indexPath = resolveIndexPath(cfg);
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, { encoding: 'utf8' });
}

export function rebuildLogIndex(cfg: LogIndexerConfig = {}): LogIndex {
  const index = buildLogIndex(cfg);
  writeLogIndex(index, cfg);
  return index;
}

export function validateReplayIndex(index: LogIndex, cfg: LogIndexerConfig = {}): LogReplayValidation {
  void cfg;
  const errors: string[] = [];
  const ordered = [...index.files].sort((a, b) => a.sequence - b.sequence);
  let expectedPrev: string | null = null;
  for (let i = 0; i < ordered.length; i++) {
    const f = ordered[i]!;
    if (f.sequence !== i + 1) {
      errors.push(`sequence mismatch for ${f.name}: expected ${i + 1}, got ${f.sequence}`);
    }
    if (f.prevHash !== expectedPrev) {
      errors.push(`prevHash mismatch for ${f.name}`);
    }
    const abs = path.resolve(process.cwd(), f.path);
    if (!fs.existsSync(abs)) {
      errors.push(`missing file: ${f.path}`);
      expectedPrev = f.hash;
      continue;
    }
    const content = fs.readFileSync(abs, 'utf8');
    const actualHash = hashContent(content);
    if (actualHash !== f.hash) {
      errors.push(`hash mismatch for ${f.name}`);
    }
    expectedPrev = f.hash;
  }
  return { valid: errors.length === 0, errors };
}

export function loadLogIndex(indexPath: string): LogIndex {
  const raw = fs.readFileSync(indexPath, 'utf8');
  return JSON.parse(raw) as LogIndex;
}

function parseLogFileLinesFromContent(absPath: string, content: string): LogEntry[] {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const out: LogEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(lines[i]!);
    } catch (e) {
      throw new ReplayIndexError(`Invalid JSON in ${absPath} line ${i + 1}: ${(e as Error).message}`);
    }
    const { valid, errors } = validateLogEntry(parsed);
    if (!valid) {
      throw new ReplayIndexError(
        `Schema validation failed in ${absPath} line ${i + 1}: ${(errors ?? []).join('; ')}`,
      );
    }
    out.push(parsed as LogEntry);
  }
  return out;
}

/** Per-file chain + content hash verification before reading lines (fail fast). */
function assertArchiveTrustedBeforeReplay(
  file: IndexedLogFile,
  expectedPrevHash: string | null,
  absPath: string,
): string {
  if (file.prevHash !== expectedPrevHash) {
    throw new ReplayIndexError(`prevHash chain break before replay: ${file.name}`);
  }
  const content = fs.readFileSync(absPath, 'utf8');
  const actual = hashContent(content);
  if (actual !== file.hash) {
    throw new ReplayIndexError(`archive content hash mismatch before replay: ${file.name}`);
  }
  return content;
}

export type ReplayTaggedEntry = {
  entry: LogEntry;
  sourceArchive: string;
  indexSequence: number;
  /** Global monotonic line order across index sequence (tie-break after timestamp / correlationId). */
  replayOrdinal: number;
};

function applyReplayFiltersTagged(tagged: ReplayTaggedEntry[], filters?: ReplayFilters): ReplayTaggedEntry[] {
  if (!filters) return tagged;
  return tagged.filter(({ entry: e }) => {
    if (filters.startTime !== undefined && e.timestamp < filters.startTime) return false;
    if (filters.endTime !== undefined && e.timestamp > filters.endTime) return false;
    if (filters.invariantIds !== undefined && filters.invariantIds.length > 0) {
      if (e.invariantId === undefined || !filters.invariantIds.includes(e.invariantId)) return false;
    }
    if (filters.nondeterministicOnly === true && e.nondeterministicMarker === undefined) return false;
    if (filters.runtimeId !== undefined && filters.runtimeId !== '' && e.runtimeId !== filters.runtimeId) {
      return false;
    }
    return true;
  });
}

/** ADR-003 formal sort: timestamp, correlationId, stable entry payload; then provenance tie-break. */
function sortTaggedDeterministically(tagged: ReplayTaggedEntry[]): ReplayTaggedEntry[] {
  return [...tagged].sort((a, b) => {
    const c = compareLogEntriesForAudit(a.entry, b.entry);
    if (c !== 0) return c;
    if (a.sourceArchive < b.sourceArchive) return -1;
    if (a.sourceArchive > b.sourceArchive) return 1;
    if (a.indexSequence < b.indexSequence) return -1;
    if (a.indexSequence > b.indexSequence) return 1;
    return 0;
  });
}

/** After deterministic sort: `replayOrdinal(i) = i + 1` (formal ADR-003 CERT definition). */
function assignFormalReplayOrdinals(sorted: ReplayTaggedEntry[]): ReplayTaggedEntry[] {
  return sorted.map((row, i) => ({ ...row, replayOrdinal: i + 1 }));
}

/**
 * Full index validation plus per-archive prevHash + content hash check before parsing lines.
 * Preserves archive provenance for audit traceability (source file + index sequence).
 */
export function replayTaggedEntriesFromIndex(indexPath: string, filters?: ReplayFilters): ReplayTaggedEntry[] {
  const index = loadLogIndex(indexPath);
  const validation = validateReplayIndex(index);
  if (!validation.valid) {
    throw new ReplayIndexError(`Replay index invalid: ${validation.errors.join('; ')}`);
  }
  const ordered = [...index.files].sort((a, b) => a.sequence - b.sequence);
  let sumPrior = 0;
  const baseOffsetByFile: number[] = [];
  for (const f of ordered) {
    baseOffsetByFile.push(sumPrior);
    sumPrior += f.entries;
  }
  let expectedPrev: string | null = null;
  const tagged: ReplayTaggedEntry[] = [];
  let fileIdx = 0;
  for (const file of ordered) {
    const base = baseOffsetByFile[fileIdx]!;
    fileIdx += 1;
    const abs = path.resolve(process.cwd(), file.path);
    const content = assertArchiveTrustedBeforeReplay(file, expectedPrev, abs);
    expectedPrev = file.hash;
    const entries = parseLogFileLinesFromContent(abs, content);
    if (entries.length !== file.entries) {
      throw new ReplayIndexError(
        `index entry count mismatch for ${file.name}: index declares ${file.entries}, parsed ${entries.length}`,
      );
    }
    for (let lineIdx = 0; lineIdx < entries.length; lineIdx++) {
      const entry = entries[lineIdx]!;
      const replayOrdinal = base + lineIdx + 1;
      tagged.push({ entry, sourceArchive: file.name, indexSequence: file.sequence, replayOrdinal });
    }
  }
  const filtered = applyReplayFiltersTagged(tagged, filters);
  return assignFormalReplayOrdinals(sortTaggedDeterministically(filtered));
}

/**
 * Replays archived log streams in index sequence order, validates the chain of trust,
 * applies optional filters, then returns entries sorted by timestamp then correlationId.
 */
export function replayFromIndex(indexPath: string, filters?: ReplayFilters): LogEntry[] {
  return replayTaggedEntriesFromIndex(indexPath, filters).map((t) => t.entry);
}

/**
 * Lexical replay over `archiveDir/*.jsonl` (sorted by filename). **No `index.json`, no hash chain.**
 * Opt-in recovery / inspection only (16F.5 SDK — must not replace tamper-evident index replay for audit proof).
 */
export function replayTaggedFromArchiveLexicalScan(archiveDir: string, filters?: ReplayFilters): ReplayTaggedEntry[] {
  const absDir = path.resolve(archiveDir);
  if (!fs.existsSync(absDir)) {
    throw new ReplayIndexError(`archive scan: directory missing: ${absDir}`);
  }
  const names = fs.readdirSync(absDir).filter((n) => n.endsWith('.jsonl')).sort((a, b) => a.localeCompare(b));
  const tagged: ReplayTaggedEntry[] = [];
  let lineBase = 0;
  let fileSeq = 0;
  for (const name of names) {
    fileSeq += 1;
    const abs = path.join(absDir, name);
    const content = fs.readFileSync(abs, 'utf8');
    const entries = parseLogFileLinesFromContent(abs, content);
    for (let lineIdx = 0; lineIdx < entries.length; lineIdx++) {
      const entry = entries[lineIdx]!;
      const replayOrdinal = lineBase + lineIdx + 1;
      tagged.push({
        entry,
        sourceArchive: name,
        indexSequence: fileSeq,
        replayOrdinal,
      });
    }
    lineBase += entries.length;
  }
  const filtered = applyReplayFiltersTagged(tagged, filters);
  return assignFormalReplayOrdinals(sortTaggedDeterministically(filtered));
}

export function replayFromArchiveLexicalScan(archiveDir: string, filters?: ReplayFilters): LogEntry[] {
  return replayTaggedFromArchiveLexicalScan(archiveDir, filters).map((t) => t.entry);
}

