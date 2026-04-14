import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import type { InvariantId, LogEntry, OnFailurePolicy } from './types';
import {
  replayFromIndex,
  replayTaggedEntriesFromIndex,
  validateReplayIndex,
  type LogIndex,
  type ReplayFilters,
  type ReplayTaggedEntry,
} from './indexer';
import { compareLogEntriesForAudit, stableStringify } from './stableAudit';
import { validateLogEntry } from './validator';
import { runExportInvariantSuite } from '../sdk/invariants';

export {
  stableStringify,
  compareLogEntriesForAudit,
  deriveReplayOrdinal,
  ADR003_FORMAL_ORDINAL_SOURCE,
  type FormalReplayTaggedEntry,
} from './stableAudit';

/** Semver for snapshot JSON `version` field. */
export const AUDIT_SNAPSHOT_VERSION = '1.0.0';

/**
 * Compliance stamp aligned with ADR-003-B matrix + 16F.4.HARDENING audit bundle revision.
 */
export const AUDIT_COMPLIANCE_VERSION = '16F.4.1';

/** Fixed zlib level for reproducible `.gz` bytes across runs (same Node/zlib). */
export const AUDIT_GZIP_LEVEL = 6;

/** CRC-32 (IEEE) for gzip trailer — pure JS, platform-independent. */
function crc32Ieee(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Canonical gzip member: **mtime = 0**, **OS = 255** (unknown), fixed deflate params.
 * Bitwise-stable across platforms for identical UTF-8 payload (16F.5.FINAL).
 */
export function gzipAuditPayloadUtf8(bodyUtf8: string): Buffer {
  const input = Buffer.from(bodyUtf8, 'utf8');
  const deflated = zlib.deflateRawSync(input, {
    level: AUDIT_GZIP_LEVEL,
    memLevel: 8,
    strategy: zlib.constants.Z_DEFAULT_STRATEGY,
  });
  const crc = crc32Ieee(input);
  const isize = input.length >>> 0;
  const header = Buffer.alloc(10);
  header[0] = 0x1f;
  header[1] = 0x8b;
  header[2] = 8;
  header[3] = 0;
  header.writeUInt32LE(0, 4);
  header[8] = 0;
  header[9] = 255;
  const trailer = Buffer.alloc(8);
  trailer.writeUInt32LE(crc, 0);
  trailer.writeUInt32LE(isize, 4);
  return Buffer.concat([header, deflated, trailer]);
}

/** Placeholder for a future enterprise signing step (all null = unsigned). */
export type AuditSignatureStub = {
  algorithm: null;
  signature: null;
  keyId: null;
};

export const AUDIT_SIGNATURE_STUB: AuditSignatureStub = {
  algorithm: null,
  signature: null,
  keyId: null,
};

export class AuditExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditExportError';
  }
}

export type AuditTraceabilityEntry = {
  correlationId: string;
  timestamp: string;
  invariantId?: InvariantId;
  onFailure?: OnFailurePolicy;
  /** Archive segment this row was replayed from (16F.4.HARDENING). */
  sourceArchive?: string;
  /** `sequence` in `index.json` for that segment (16F.4.HARDENING). */
  indexSequence?: number;
};

/** Runtime health slice for SN-only audit (16F.5.CLOSURE). */
export type RuntimeState = 'ACTIVE' | 'IDLE' | 'DEGRADED' | 'FAILED';

export type AuditSnapshotRuntime = {
  state: RuntimeState;
  activeComponents: number;
  activeComponentsList: string[];
  lastFailedPhase?: string;
  invariantViolations?: string[];
};

export type InvariantEnforcementResult = {
  invariantId: string;
  status: 'ENFORCED' | 'VIOLATED';
  failureMode?: string;
};

export type AuditSnapshotSdkClosure = {
  auditMode: 'STRICT' | 'RELAXED';
  unsafeReplayUsed: boolean;
  invariantEnforcement?: InvariantEnforcementResult[];
};

export type AuditSnapshot = {
  version: string;
  complianceVersion: string;
  generatedAt: string;
  runtimeId: string;
  indexPath: string;
  /** Cryptographic fingerprint of raw `index.json` octets (chain-of-trust anchor). */
  indexHash: string;
  logEntries: LogEntry[];
  traceability: AuditTraceabilityEntry[];
  filters?: ReplayFilters | null;
  signatureStub?: AuditSignatureStub;
  /** Derived from replayed log entries unless overridden at export (ADR-003 closure). */
  runtime?: AuditSnapshotRuntime;
  /** Audit mode and enforcement trace for strict/relaxed isolation. */
  sdkClosure?: AuditSnapshotSdkClosure;
};

export type AuditExportOptions = {
  indexPath: string;
  runtimeId?: string;
  filters?: ReplayFilters;
  /** Output directory; default `artifacts/logs` under cwd. */
  outputDir?: string;
  /** Write `zlib`-compressed copy next to the JSON snapshot. */
  compress?: boolean;
  /** If set, atomically writes the replayed stream as a JSON array (durable fsync). */
  replayLogPath?: string;
  now?: () => Date;
  /**
   * When set, used as `generatedAt` instead of `now()` so repeated exports with the same inputs are bitwise-identical.
   */
  deterministicGeneratedAt?: string;
  /**
   * When false (default), refuse to replace an existing snapshot/replay/gzip target — append-only policy.
   */
  allowOverwrite?: boolean;
  /** Maps to snapshot `sdkClosure.auditMode` (uppercase). Default `strict`. */
  auditMode?: 'strict' | 'relaxed';
  /** When true, stamped on snapshot for strict validation to reject attestations. */
  unsafeReplayUsed?: boolean;
  /** Merged over `deriveAuditRuntime(logEntries)` for `snapshot.runtime`. */
  runtime?: Partial<AuditSnapshotRuntime>;
  /** Written to `sdkClosure.invariantEnforcement` (replay/export pipeline). */
  invariantEnforcement?: InvariantEnforcementResult[];
};

export type AuditValidationResult = {
  valid: boolean;
  errors: string[];
  /** Human-readable lines for CLI / logs. */
  report: string[];
};

/** Recursively sort object keys for canonical object graphs (arrays: map elements; order preserved unless sorted upstream). */
export function canonicalizeKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeKeysDeep);
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (obj[k] === undefined) continue;
    out[k] = canonicalizeKeysDeep(obj[k]);
  }
  return out;
}

/** Deterministic ordering + key canonicalization for replay/export/compare. */
export function normalizeLogEntriesForAudit(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort(compareLogEntriesForAudit).map((e) => canonicalizeKeysDeep(e) as LogEntry);
}

function compareTaggedForAudit(a: ReplayTaggedEntry, b: ReplayTaggedEntry): number {
  const t = compareLogEntriesForAudit(a.entry, b.entry);
  if (t !== 0) return t;
  if (a.sourceArchive < b.sourceArchive) return -1;
  if (a.sourceArchive > b.sourceArchive) return 1;
  if (a.indexSequence < b.indexSequence) return -1;
  if (a.indexSequence > b.indexSequence) return 1;
  return 0;
}

/** Canonical tagged replay: stable entry order + key order (replayOrdinal tie-break). */
export function normalizeTaggedReplayForAudit(tagged: ReplayTaggedEntry[]): ReplayTaggedEntry[] {
  return [...tagged]
    .sort(compareTaggedForAudit)
    .map((row) => ({
      ...row,
      entry: canonicalizeKeysDeep(row.entry) as LogEntry,
    }));
}

/** Volatile field placeholder for logical compare mode (cross-export equality). */
export const AUDIT_NORMALIZED_AT_MARKER = '__IRIS_AUDIT_NORMALIZED_AT__';

export const AUDIT_NORMALIZED_INDEXPATH_MARKER = '__IRIS_AUDIT_NORMALIZED_INDEXPATH__';

export function deriveAuditRuntime(logEntries: LogEntry[], override?: Partial<AuditSnapshotRuntime>): AuditSnapshotRuntime {
  const runtimeIds = [...new Set(logEntries.map((e) => e.runtimeId))].sort((x, y) => x.localeCompare(y));
  const failed = logEntries.filter((e) => e.level === 'ERROR' || e.audit.compliant === false);
  const failedSorted = [...failed].sort(compareLogEntriesForAudit);
  const lastFailed = failedSorted.length > 0 ? failedSorted[failedSorted.length - 1]! : undefined;
  const invViol = logEntries
    .filter((e) => e.invariantId !== undefined && e.audit.compliant === false)
    .map((e) => String(e.invariantId))
    .sort((x, y) => x.localeCompare(y));
  let state: RuntimeState = 'ACTIVE';
  if (logEntries.length === 0) state = 'IDLE';
  else if (failed.some((e) => e.level === 'ERROR')) state = 'FAILED';
  else if (failed.length > 0 || invViol.length > 0) state = 'DEGRADED';

  const base: AuditSnapshotRuntime = {
    state,
    activeComponents: runtimeIds.length,
    activeComponentsList: runtimeIds,
    ...(lastFailed?.phase !== undefined ? { lastFailedPhase: lastFailed.phase } : {}),
    ...(invViol.length > 0 ? { invariantViolations: [...new Set(invViol)].sort((x, y) => x.localeCompare(y)) } : {}),
  };
  return override === undefined ? base : { ...base, ...override };
}

/**
 * Canonical snapshot for export on disk, compare, and tests.
 * `export`: stable array ordering + recursive key order.
 * `compare`: additionally replaces wall-clock `generatedAt` and normalizes `indexPath` to forward slashes for cross-platform equality.
 */
export function normalizeAuditSnapshot(
  snapshot: AuditSnapshot,
  mode: 'export' | 'compare' = 'export',
): AuditSnapshot {
  const sortedEntries = normalizeLogEntriesForAudit(snapshot.logEntries);
  const sortedTrace = sortTraceabilityRows(snapshot.traceability);
  let next: AuditSnapshot = {
    ...snapshot,
    logEntries: sortedEntries,
    traceability: sortedTrace,
  };
  if (mode === 'compare') {
    next = {
      ...next,
      generatedAt: AUDIT_NORMALIZED_AT_MARKER,
      indexPath: typeof next.indexPath === 'string' ? next.indexPath.split(path.sep).join('/') : next.indexPath,
    };
  }
  return canonicalizeKeysDeep(next) as AuditSnapshot;
}

/** Single source of truth for snapshot equality / hash (ADR-003 CERT). */
export type CanonicalAuditSnapshot = AuditSnapshot;

/**
 * **Mandatory** contract: never compare raw snapshots with JSON.stringify or deepEqual —
 * always normalize with mode `compare` first.
 */
export function snapshotsAuditCanonicallyEqual(a: AuditSnapshot, b: AuditSnapshot): boolean {
  return stableStringify(normalizeAuditSnapshot(a, 'compare')) === stableStringify(normalizeAuditSnapshot(b, 'compare'));
}

export function hashIndexFileContent(content: string): string {
  const digest = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  return `sha256-${digest}`;
}

function defaultOutputDir(): string {
  return path.resolve(process.cwd(), 'artifacts/logs');
}

/** Deterministic snapshot basename: index hash material + filter digest (no wall-clock). */
export function deriveSnapshotBasename(indexHash: string, filters: ReplayFilters | null | undefined): string {
  const hex = indexHash.replace(/^sha256-/, '');
  const indexPart = hex.slice(0, 16);
  const filt =
    filters === undefined || filters === null
      ? 'nofilter'
      : crypto.createHash('sha256').update(stableStringify(filters), 'utf8').digest('hex').slice(0, 12);
  return `audit-snapshot-${indexPart}-${filt}.json`;
}

function assertExportTargetAvailable(targetPath: string, allowOverwrite: boolean): void {
  if (!allowOverwrite && fs.existsSync(targetPath)) {
    throw new AuditExportError(
      `Refusing to overwrite existing audit artifact (append-only): ${targetPath}. Set allowOverwrite: true to replace.`,
    );
  }
}

export function writeAtomicDurable(targetPath: string, data: string | Buffer, allowOverwrite: boolean): void {
  assertExportTargetAvailable(targetPath, allowOverwrite);
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(targetPath)}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`,
  );
  const fd = fs.openSync(tmp, 'w');
  try {
    if (typeof data === 'string') {
      fs.writeFileSync(fd, data, { encoding: 'utf8' });
    } else {
      fs.writeFileSync(fd, data);
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(tmp, targetPath);
    const outFd = fs.openSync(targetPath, 'r+');
    try {
      fs.fsyncSync(outFd);
    } finally {
      fs.closeSync(outFd);
    }
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw e;
  }
}

export function buildTraceabilityFromTagged(tagged: ReplayTaggedEntry[]): AuditTraceabilityEntry[] {
  const rows: AuditTraceabilityEntry[] = [];
  for (const { entry: e, sourceArchive, indexSequence } of tagged) {
    if (e.invariantId !== undefined || e.audit.onFailure !== undefined) {
      rows.push({
        correlationId: e.correlationId,
        timestamp: e.timestamp,
        invariantId: e.invariantId,
        onFailure: e.audit.onFailure,
        sourceArchive,
        indexSequence,
      });
    }
  }
  return sortTraceabilityRows(rows);
}

export function buildTraceabilityFromEntries(logEntries: LogEntry[]): AuditTraceabilityEntry[] {
  const rows: AuditTraceabilityEntry[] = [];
  for (const e of logEntries) {
    if (e.invariantId !== undefined || e.audit.onFailure !== undefined) {
      rows.push({
        correlationId: e.correlationId,
        timestamp: e.timestamp,
        invariantId: e.invariantId,
        onFailure: e.audit.onFailure,
      });
    }
  }
  return sortTraceabilityRows(rows);
}

function sortTraceabilityRows(rows: AuditTraceabilityEntry[]): AuditTraceabilityEntry[] {
  return [...rows].sort((a, b) => {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    if (a.correlationId < b.correlationId) return -1;
    if (a.correlationId > b.correlationId) return 1;
    const ai = a.invariantId ?? '';
    const bi = b.invariantId ?? '';
    if (ai < bi) return -1;
    if (ai > bi) return 1;
    return 0;
  });
}

/** Log replay parity: canonical row order + keys (used inside `validateAuditSnapshot`; not for full snapshot objects). */
function logEntriesCanonicallyEqual(a: LogEntry[], b: LogEntry[]): boolean {
  return stableStringify(normalizeLogEntriesForAudit(a)) === stableStringify(normalizeLogEntriesForAudit(b));
}

function traceabilityValidated(
  snapTrace: AuditTraceabilityEntry[],
  expectedTagged: AuditTraceabilityEntry[],
  expectedLegacy: AuditTraceabilityEntry[],
): boolean {
  const a = stableStringify(sortTraceabilityRows(snapTrace));
  if (a === stableStringify(sortTraceabilityRows(expectedTagged))) return true;
  if (a === stableStringify(sortTraceabilityRows(expectedLegacy))) return true;
  return false;
}

function isValidSignatureStub(x: unknown): boolean {
  if (x === undefined) return true;
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.algorithm === null && o.signature === null && o.keyId === null;
}

/** Export compliance snapshot + optional gzip + optional replay JSON. Returns the in-memory snapshot. */
export function exportAuditSnapshot(options: AuditExportOptions): AuditSnapshot {
  const now = (options.now ?? ((): Date => new Date()))();
  const allowOverwrite = options.allowOverwrite === true;
  const indexPathAbs = path.resolve(options.indexPath);
  const indexRaw = fs.readFileSync(indexPathAbs, 'utf8');
  const indexHash = hashIndexFileContent(indexRaw);
  const index = JSON.parse(indexRaw) as LogIndex;

  const tagged = replayTaggedEntriesFromIndex(indexPathAbs, options.filters);
  const logEntries = tagged.map((t) => t.entry);
  const runtimeId = options.runtimeId ?? logEntries[0]?.runtimeId ?? index.generatedAt;
  const traceability = buildTraceabilityFromTagged(tagged);

  const generatedAt = options.deterministicGeneratedAt ?? now.toISOString();
  const auditModeUpper: 'STRICT' | 'RELAXED' = (options.auditMode ?? 'strict') === 'relaxed' ? 'RELAXED' : 'STRICT';

  const suite =
    options.invariantEnforcement !== undefined && options.invariantEnforcement.length > 0
      ? runExportInvariantSuite(tagged, options.invariantEnforcement)
      : runExportInvariantSuite(tagged);
  for (const r of suite.enforcement) {
    if (r.status === 'VIOLATED') {
      throw new AuditExportError(
        `Export blocked: invariant ${r.invariantId} VIOLATED (${r.failureMode ?? ''})`,
      );
    }
  }
  const inv = suite.enforcement;

  const snapshot: AuditSnapshot = {
    version: AUDIT_SNAPSHOT_VERSION,
    complianceVersion: AUDIT_COMPLIANCE_VERSION,
    generatedAt,
    runtimeId,
    indexPath: indexPathAbs,
    indexHash,
    logEntries,
    traceability,
    filters: options.filters === undefined ? null : options.filters,
    signatureStub: AUDIT_SIGNATURE_STUB,
    runtime: deriveAuditRuntime(logEntries, options.runtime),
    sdkClosure: {
      auditMode: auditModeUpper,
      unsafeReplayUsed: options.unsafeReplayUsed === true,
      invariantEnforcement: inv,
    },
  };

  const normalized = normalizeAuditSnapshot(snapshot, 'export');

  const outDir = options.outputDir ?? defaultOutputDir();
  const baseName = deriveSnapshotBasename(indexHash, options.filters === undefined ? null : options.filters);
  const jsonPath = path.join(outDir, baseName);
  const body = `${stableStringify(normalized)}\n`;
  writeAtomicDurable(jsonPath, body, allowOverwrite);

  if (options.compress === true) {
    const gzPath = `${jsonPath}.gz`;
    writeAtomicDurable(gzPath, gzipAuditPayloadUtf8(body), allowOverwrite);
  }

  if (options.replayLogPath !== undefined) {
    const replayBody = `${stableStringify(normalized.logEntries)}\n`;
    writeAtomicDurable(path.resolve(options.replayLogPath), replayBody, allowOverwrite);
  }

  return normalized;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function validateSdkClosureAndRuntime(raw: Record<string, unknown>, errors: string[], report: string[]): void {
  report.push('--- SDK closure / runtime (16F.5.CLOSURE) ---');
  const rt = raw.runtime;
  if (rt !== undefined) {
    if (!isRecord(rt)) {
      errors.push('runtime must be an object when present');
    } else {
      const okStates = new Set<string>(['ACTIVE', 'IDLE', 'DEGRADED', 'FAILED']);
      if (typeof rt.state !== 'string' || !okStates.has(rt.state)) {
        errors.push('runtime.state must be ACTIVE | IDLE | DEGRADED | FAILED');
      }
      if (typeof rt.activeComponents !== 'number' || !Number.isFinite(rt.activeComponents)) {
        errors.push('runtime.activeComponents must be a finite number');
      }
      if (!Array.isArray(rt.activeComponentsList)) {
        errors.push('runtime.activeComponentsList must be an array');
      } else if (!rt.activeComponentsList.every((x: unknown) => typeof x === 'string')) {
        errors.push('runtime.activeComponentsList must be string[]');
      } else if (typeof rt.activeComponents === 'number' && rt.activeComponents !== rt.activeComponentsList.length) {
        errors.push('runtime.activeComponents must equal runtime.activeComponentsList.length');
      }
      if (rt.lastFailedPhase !== undefined && typeof rt.lastFailedPhase !== 'string') {
        errors.push('runtime.lastFailedPhase must be a string when present');
      }
      if (rt.invariantViolations !== undefined) {
        if (!Array.isArray(rt.invariantViolations) || !rt.invariantViolations.every((x: unknown) => typeof x === 'string')) {
          errors.push('runtime.invariantViolations must be string[] when present');
        }
      }
    }
  }

  const cl = raw.sdkClosure;
  if (cl !== undefined) {
    if (!isRecord(cl)) {
      errors.push('sdkClosure must be an object when present');
    } else {
      if (cl.auditMode !== 'STRICT' && cl.auditMode !== 'RELAXED') {
        errors.push('sdkClosure.auditMode must be STRICT or RELAXED');
      }
      if (typeof cl.unsafeReplayUsed !== 'boolean') {
        errors.push('sdkClosure.unsafeReplayUsed must be a boolean');
      }
      if (cl.invariantEnforcement !== undefined) {
        if (!Array.isArray(cl.invariantEnforcement)) {
          errors.push('sdkClosure.invariantEnforcement must be an array when present');
        } else {
          for (let i = 0; i < cl.invariantEnforcement.length; i++) {
            const row = cl.invariantEnforcement[i];
            if (
              !isRecord(row) ||
              typeof row.invariantId !== 'string' ||
              (row.status !== 'ENFORCED' && row.status !== 'VIOLATED')
            ) {
              errors.push(`sdkClosure.invariantEnforcement[${i}] has invalid shape`);
            }
          }
          for (const row of cl.invariantEnforcement) {
            if (isRecord(row) && row.status === 'VIOLATED') {
              errors.push(
                `sdkClosure.invariantEnforcement records VIOLATED: ${String(row.invariantId ?? '?')}`,
              );
            }
          }
        }
      }
    }
  }

  const logEntriesUnknown = raw.logEntries;
  if (
    rt !== undefined &&
    isRecord(rt) &&
    Array.isArray(rt.invariantViolations) &&
    Array.isArray(logEntriesUnknown)
  ) {
    for (const id of rt.invariantViolations) {
      if (typeof id !== 'string') continue;
      const ok = (logEntriesUnknown as LogEntry[]).some(
        (e) =>
          e &&
          typeof e === 'object' &&
          String((e as LogEntry).invariantId) === id &&
          (e as LogEntry).audit.compliant === false,
      );
      if (!ok) {
        errors.push(
          `runtime.invariantViolations lists ${id} but no non-compliant logEntries row for that invariant`,
        );
      }
    }
  }
}

/**
 * Validates a snapshot file: schema (16F.1), index chain + hash, replay consistency, traceability completeness.
 */
export function validateAuditSnapshot(snapshotRaw: unknown, readIndexFromDisk = true): AuditValidationResult {
  const errors: string[] = [];
  const report: string[] = [];

  if (!isRecord(snapshotRaw)) {
    errors.push('Snapshot root must be an object');
    const body = ['--- Summary ---', ...errors.map((e) => `  - ${e}`)];
    return { valid: false, errors, report: ['INVALID', ...body] };
  }

  if (!isValidSignatureStub(snapshotRaw.signatureStub)) {
    errors.push('signatureStub must be { algorithm: null, signature: null, keyId: null } when present');
  }

  const required = [
    'version',
    'complianceVersion',
    'generatedAt',
    'runtimeId',
    'indexPath',
    'indexHash',
    'logEntries',
    'traceability',
  ] as const;
  for (const k of required) {
    if (!(k in snapshotRaw)) {
      errors.push(`Missing required field: ${k}`);
    }
  }

  const logEntriesUnknown = snapshotRaw.logEntries;
  if (!Array.isArray(logEntriesUnknown)) {
    errors.push('logEntries must be an array');
  }

  const indexPathRaw = snapshotRaw.indexPath;
  if (typeof indexPathRaw !== 'string' || indexPathRaw.length === 0) {
    errors.push('indexPath must be a non-empty string');
  }

  if (typeof snapshotRaw.indexHash !== 'string') {
    errors.push('indexHash must be a string');
  }

  let parsedEntries: LogEntry[] = [];
  let perEntryInvalid = 0;
  if (Array.isArray(logEntriesUnknown)) {
    for (let i = 0; i < logEntriesUnknown.length; i++) {
      const v = validateLogEntry(logEntriesUnknown[i]);
      if (!v.valid) {
        perEntryInvalid += 1;
        errors.push(`logEntries[${i}]: ${(v.errors ?? []).join('; ')}`);
      }
    }
    parsedEntries = logEntriesUnknown as LogEntry[];
  }

  const snapTrace = snapshotRaw.traceability;
  if (!Array.isArray(snapTrace)) {
    errors.push('traceability must be an array');
  }

  const idxPath =
    typeof indexPathRaw === 'string' && indexPathRaw.length > 0 ? path.resolve(indexPathRaw) : '';

  const filters: ReplayFilters | undefined =
    snapshotRaw.filters === null || snapshotRaw.filters === undefined
      ? undefined
      : (snapshotRaw.filters as ReplayFilters);

  let indexPresent = false;
  let diskHashMatch = false;
  let chainValid = false;
  let indexReadyForReplay = false;

  report.push('--- Index integrity ---');
  if (readIndexFromDisk && idxPath.length > 0) {
    indexPresent = fs.existsSync(idxPath);
    if (!indexPresent) {
      errors.push(`Index file missing: ${idxPath}`);
      report.push(`index path: ${idxPath}`);
      report.push('index on disk: missing');
    } else {
      report.push(`index path: ${idxPath}`);
      report.push('index on disk: present');
      const rawIdx = fs.readFileSync(idxPath, 'utf8');
      const diskHash = hashIndexFileContent(rawIdx);
      diskHashMatch = diskHash === snapshotRaw.indexHash;
      if (!diskHashMatch) {
        errors.push('indexHash does not match index file on disk (tamper or stale snapshot)');
      }
      const idx = JSON.parse(rawIdx) as LogIndex;
      const chain = validateReplayIndex(idx);
      chainValid = chain.valid;
      if (!chain.valid) {
        errors.push(`Index chain invalid: ${chain.errors.join('; ')}`);
      }
      report.push(`index chain valid: ${chain.valid}`);
      report.push(`index hash matches disk: ${diskHashMatch}`);
      indexReadyForReplay = indexPresent && diskHashMatch && chainValid;

      if (indexReadyForReplay && Array.isArray(logEntriesUnknown)) {
        try {
          const replayed = replayFromIndex(idxPath, filters);
          if (!logEntriesCanonicallyEqual(replayed, parsedEntries)) {
            errors.push('logEntries do not match replayFromIndex(indexPath, filters)');
          }
        } catch (e) {
          errors.push(`Replay failed: ${(e as Error).message}`);
        }
      }
    }
  } else {
    report.push(`index path: ${idxPath || '(none)'}`);
    report.push('index on disk: (skipped)');
  }

  report.push('--- Per-entry validation (16F.1) ---');
  report.push(
    `entries checked: ${Array.isArray(logEntriesUnknown) ? logEntriesUnknown.length : 0} | schema-invalid: ${perEntryInvalid}`,
  );

  report.push('--- Traceability ---');
  if (Array.isArray(snapTrace)) {
    report.push(`rows: ${snapTrace.length}`);
  } else {
    report.push('rows: (invalid)');
  }

  if (Array.isArray(snapTrace) && Array.isArray(logEntriesUnknown)) {
    const expectedLegacy = buildTraceabilityFromEntries(parsedEntries);
    let traceOk = false;
    let traceReplayError = false;
    if (readIndexFromDisk && indexReadyForReplay) {
      try {
        const expectedTagged = buildTraceabilityFromTagged(replayTaggedEntriesFromIndex(idxPath, filters));
        traceOk = traceabilityValidated(snapTrace as AuditTraceabilityEntry[], expectedTagged, expectedLegacy);
      } catch (e) {
        traceReplayError = true;
        errors.push(`Traceability replay failed: ${(e as Error).message}`);
      }
    } else {
      traceOk =
        stableStringify(sortTraceabilityRows(snapTrace as AuditTraceabilityEntry[])) ===
        stableStringify(sortTraceabilityRows(expectedLegacy));
    }
    if (!traceOk && !traceReplayError) {
      errors.push('Traceability mapping incomplete or inconsistent with logEntries / replay index');
    }
  }

  validateSdkClosureAndRuntime(snapshotRaw, errors, report);

  const invariantSummary = new Map<string, { count: number; onFailure: Set<string> }>();
  for (const e of parsedEntries) {
    if (e.invariantId) {
      const cur = invariantSummary.get(e.invariantId) ?? { count: 0, onFailure: new Set<string>() };
      cur.count += 1;
      if (e.audit.onFailure) cur.onFailure.add(e.audit.onFailure);
      invariantSummary.set(e.invariantId, cur);
    }
  }

  report.push('--- Compliance / snapshot ---');
  report.push(`complianceVersion: ${String(snapshotRaw.complianceVersion ?? '')}`);
  report.push(`snapshot.version: ${String(snapshotRaw.version ?? '')}`);
  report.push(`generatedAt: ${String(snapshotRaw.generatedAt ?? '')}`);
  report.push(`runtimeId: ${String(snapshotRaw.runtimeId ?? '')}`);
  report.push(`indexHash (snapshot): ${String(snapshotRaw.indexHash ?? '')}`);
  report.push('Invariants (count, onFailure policies):');
  for (const [inv, info] of [...invariantSummary.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    report.push(`  ${inv}: ${info.count} | ${[...info.onFailure].sort().join(',') || '—'}`);
  }
  if (errors.length > 0) {
    report.push('--- Errors ---');
    report.push(...errors.map((e) => `  - ${e}`));
  }

  const statusLine = errors.length === 0 ? 'VALID' : 'INVALID';
  return { valid: errors.length === 0, errors, report: [statusLine, ...report] };
}
