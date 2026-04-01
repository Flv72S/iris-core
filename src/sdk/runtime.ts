/**
 * 16F.5.FINAL.CERTIFICATION — SDK / runtime: deterministic default, strict audit isolation, ADR-003
 * enforcement trace, canonical snapshot contract, formal replayOrdinal, and invariant coverage (SN|RT|TS).
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  AUDIT_COMPLIANCE_VERSION,
  AUDIT_SNAPSHOT_VERSION,
  exportAuditSnapshot as exportAuditSnapshotCore,
  gzipAuditPayloadUtf8,
  normalizeLogEntriesForAudit,
  normalizeTaggedReplayForAudit,
  snapshotsAuditCanonicallyEqual,
  stableStringify,
  validateAuditSnapshot as validateAuditSnapshotPayload,
  type AuditExportOptions,
  type AuditSnapshot,
  type CanonicalAuditSnapshot,
  type InvariantEnforcementResult,
} from '../logging/audit';
import {
  replayTaggedEntriesFromIndex,
  replayTaggedFromArchiveLexicalScan,
  ReplayIndexError,
  type ReplayFilters,
  type ReplayTaggedEntry,
} from '../logging/indexer';
import { createLogger, type Logger, type LoggerOptions } from '../logging/logger';
import type { LogEntry } from '../logging/types';
import { deepFreezeSdk } from './determinism';
import { DeterminismViolationError, InvariantViolationError } from './errors';
import {
  assertReplayOrdinalDeterminism,
  buildCertCoverageRows,
  enforceInvariant,
  runReplayInvariantSuite,
  type InvariantCoverageEntry,
} from './invariants';

export type { AuditSnapshot, CanonicalAuditSnapshot, ReplayTaggedEntry, ReplayFilters, Logger, LogEntry };
export type { InvariantEnforcementResult, InvariantCoverageEntry };
export { enforceInvariant, assertReplayOrdinalDeterminism, buildCertCoverageRows };
export {
  normalizeAuditSnapshot,
  normalizeLogEntriesForAudit,
  normalizeTaggedReplayForAudit,
  canonicalizeKeysDeep,
  snapshotsAuditCanonicallyEqual,
  deriveReplayOrdinal,
} from '../logging/audit';
export { AUDIT_COMPLIANCE_VERSION, AUDIT_SNAPSHOT_VERSION, ReplayIndexError };
export {
  DeterminismViolationError,
  InvariantViolationError,
  SnapshotIntegrityError,
} from './errors';
export { deepFreezeSdk } from './determinism';

export type SdkPathResolutionMode = 'explicit' | 'environment' | 'deterministic';

export type SdkPaths = {
  logDir: string;
  indexPath: string;
  resolutionMode: SdkPathResolutionMode;
};

export type SdkResolutionInput =
  | { mode: 'explicit'; logDir: string; indexPath: string }
  | { mode: 'deterministic'; cwd?: string }
  /** @deprecated Alias of `{ mode: 'deterministic', cwd }` */
  | { mode: 'default'; cwd?: string }
  | { mode: 'environment' };

/** Normalized resolver — **no hidden env reads** in `deterministic` mode. */
export function normalizeSdkPaths(resolution: SdkResolutionInput): SdkPaths {
  if (resolution.mode === 'explicit') {
    const logDir = path.resolve(resolution.logDir);
    const indexPath = path.resolve(resolution.indexPath);
    return { logDir, indexPath, resolutionMode: 'explicit' };
  }
  if (resolution.mode === 'deterministic' || resolution.mode === 'default') {
    const cwd = resolution.cwd ?? process.cwd();
    const logDir = path.resolve(cwd, 'artifacts/logs');
    return { logDir, indexPath: path.join(logDir, 'index.json'), resolutionMode: 'deterministic' };
  }
  const envDir = process.env.IRIS_LOG_DIR;
  const logDir =
    envDir != null && envDir.trim().length > 0
      ? path.resolve(envDir)
      : path.resolve(process.cwd(), 'artifacts/logs');
  const envIdx = process.env.IRIS_LOG_INDEX_PATH;
  const indexPath =
    envIdx != null && envIdx.trim().length > 0 ? path.resolve(envIdx) : path.join(logDir, 'index.json');
  return { logDir, indexPath, resolutionMode: 'environment' };
}

/** Legacy IRIS_* resolution — **explicit** use only for backward compatibility. */
export function resolveSdkLogDir(): string {
  return normalizeSdkPaths({ mode: 'environment' }).logDir;
}

export function resolveSdkIndexPath(): string {
  return normalizeSdkPaths({ mode: 'environment' }).indexPath;
}

export type SdkAuditLevel = 'strict' | 'relaxed';

export type SdkReplayContext = {
  resolution?: SdkResolutionInput;
  auditLevel?: SdkAuditLevel;
  unsafeReplay?: boolean;
  indexRecovery?: 'strict' | 'archive-scan';
};

export type SdkValidationContext = {
  auditLevel?: SdkAuditLevel;
};

export type RuntimeLoggerOptions = LoggerOptions;

export function createRuntimeLogger(runtimeId: string, options?: RuntimeLoggerOptions): Logger {
  return createLogger(runtimeId, options);
}

function mapStrictReplayFailure(e: unknown): never {
  if (e instanceof SyntaxError) {
    throw new InvariantViolationError(`index JSON corrupted: ${e.message}`, { cause: e });
  }
  if (e instanceof ReplayIndexError) {
    const m = e.message;
    if (
      m.includes('prevHash') ||
      m.includes('hash mismatch') ||
      m.includes('chain break') ||
      m.includes('Replay index invalid') ||
      m.includes('sequence mismatch') ||
      m.includes('entry count mismatch')
    ) {
      throw new InvariantViolationError(m, { cause: e });
    }
    throw e;
  }
  throw e;
}

function defaultReplayResolution(): SdkResolutionInput {
  return { mode: 'deterministic' };
}

function resolveReplayPaths(ctx?: SdkReplayContext): SdkPaths {
  return normalizeSdkPaths(ctx?.resolution ?? defaultReplayResolution());
}

/**
 * **Strict** audit forbids `archive-scan` entirely. **Relaxed** allows it only with `unsafeReplay: true`.
 */
function assertReplayAuditPolicy(ctx?: SdkReplayContext): void {
  if (ctx?.indexRecovery !== 'archive-scan') return;
  const level = ctx.auditLevel ?? 'strict';
  if (level === 'strict') {
    throw new InvariantViolationError(
      'STRICT_AUDIT_VIOLATION: archive-scan is incompatible with auditLevel strict (index/hash chain required) [AUDIT_VIOLATION_CONTEXT: archiveScanForbiddenInStrict]',
    );
  }
  if (ctx.unsafeReplay !== true) {
    throw new InvariantViolationError(
      'archive-scan requires SdkReplayContext.unsafeReplay: true (hash chain is not verified) [AUDIT_VIOLATION_CONTEXT: unsafeReplayRequired]',
    );
  }
}

function requireInvariantPass(results: InvariantEnforcementResult[]): void {
  for (const r of results) {
    if (r.status === 'VIOLATED') {
      throw new InvariantViolationError(`Invariant ${r.invariantId} VIOLATED: ${r.failureMode ?? 'unknown'}`);
    }
  }
}

export function replayAuditEntries(filters?: ReplayFilters, ctx?: SdkReplayContext): LogEntry[] {
  assertReplayAuditPolicy(ctx);
  const paths = resolveReplayPaths(ctx);
  const unsafeUsed = ctx?.indexRecovery === 'archive-scan';
  void unsafeUsed;
  if (ctx?.indexRecovery === 'archive-scan') {
    const archiveDir = path.join(paths.logDir, 'archive');
    const tagged = replayTaggedFromArchiveLexicalScan(archiveDir, filters);
    const entries = tagged.map((t) => t.entry);
    requireInvariantPass(runReplayInvariantSuite(entries, tagged).enforcement);
    return deepFreezeSdk(normalizeLogEntriesForAudit(entries));
  }
  try {
    const tagged = replayTaggedEntriesFromIndex(paths.indexPath, filters);
    const entries = tagged.map((t) => t.entry);
    requireInvariantPass(runReplayInvariantSuite(entries, tagged).enforcement);
    return deepFreezeSdk(normalizeLogEntriesForAudit(entries));
  } catch (e) {
    mapStrictReplayFailure(e);
  }
}

export function replayAuditTaggedEntries(filters?: ReplayFilters, ctx?: SdkReplayContext): ReplayTaggedEntry[] {
  assertReplayAuditPolicy(ctx);
  const paths = resolveReplayPaths(ctx);
  if (ctx?.indexRecovery === 'archive-scan') {
    const archiveDir = path.join(paths.logDir, 'archive');
    const tagged = replayTaggedFromArchiveLexicalScan(archiveDir, filters);
    const entries = tagged.map((t) => t.entry);
    requireInvariantPass(runReplayInvariantSuite(entries, tagged).enforcement);
    return deepFreezeSdk(normalizeTaggedReplayForAudit(tagged));
  }
  try {
    const tagged = replayTaggedEntriesFromIndex(paths.indexPath, filters);
    const entries = tagged.map((t) => t.entry);
    requireInvariantPass(runReplayInvariantSuite(entries, tagged).enforcement);
    return deepFreezeSdk(normalizeTaggedReplayForAudit(tagged));
  } catch (e) {
    mapStrictReplayFailure(e);
  }
}

export type SdkDeterminismExport = {
  snapshotGeneratedAt?: string;
};

export type SdkAuditExportOptions = Omit<AuditExportOptions, 'indexPath' | 'deterministicGeneratedAt'> & {
  indexPath?: string;
  resolution?: SdkResolutionInput;
  determinism?: SdkDeterminismExport;
  /** Maps to snapshot `sdkClosure.auditMode` (default strict). */
  auditLevel?: SdkAuditLevel;
  /** When true, strict SDK validation rejects attestation. */
  unsafeReplayUsed?: boolean;
};

function defaultExportResolution(): SdkResolutionInput {
  return { mode: 'deterministic' };
}

function resolveExportPaths(options: SdkAuditExportOptions): { indexPath: string } {
  if (options.indexPath !== undefined && options.indexPath.length > 0) {
    return { indexPath: path.resolve(options.indexPath) };
  }
  if (options.resolution !== undefined) {
    return { indexPath: normalizeSdkPaths(options.resolution).indexPath };
  }
  return { indexPath: normalizeSdkPaths(defaultExportResolution()).indexPath };
}

export function exportAuditSnapshot(options: SdkAuditExportOptions): AuditSnapshot {
  const { indexPath } = resolveExportPaths(options);
  const { resolution: _res, determinism, auditLevel, ...rest } = options;
  void _res;
  const core: AuditExportOptions = {
    ...(rest as AuditExportOptions),
    indexPath,
    auditMode: options.auditMode ?? auditLevel ?? 'strict',
    unsafeReplayUsed: options.unsafeReplayUsed === true,
    ...(determinism?.snapshotGeneratedAt !== undefined
      ? { deterministicGeneratedAt: determinism.snapshotGeneratedAt }
      : {}),
  };
  const snap = exportAuditSnapshotCore(core);
  return deepFreezeSdk(snap);
}

export type SdkFailureClassification =
  | 'none'
  | 'schema'
  | 'index_chain'
  | 'traceability'
  | 'adr_version'
  | 'snapshot_integrity'
  | 'filesystem'
  | 'strict_attestation';

export type ValidationReport = {
  valid: boolean;
  errors: string[];
  report: string[];
  adrCompliance: {
    expectedVersion: string;
    snapshotComplianceVersion: string | undefined;
    aligned: boolean;
  };
  auditMode: 'STRICT' | 'RELAXED';
  unsafeReplayUsed: boolean;
  compliance: {
    adrVersion: string;
    /** Full ADR-003 traceability matrix row (principle → enforcement → evidence); non-empty when parsed valid. */
    invariantCoverage: InvariantCoverageEntry[];
    legacyInvariantCoverageIds: string[];
    /** @deprecated Prefer `invariantCoverage`. */
    invariantCoverageDetail: readonly { id: string; enforcement?: string; api?: string; status?: string }[];
    enforcementStatus: 'COMPLETE' | 'PARTIAL';
    failureClassifications: string[];
    failureClassification: SdkFailureClassification;
    auditLevel: SdkAuditLevel;
    invariantEnforcement: InvariantEnforcementResult[];
  };
};

function classifyFailure(errors: string[]): SdkFailureClassification {
  for (const e of errors) {
    if (e.includes('STRICT attestation') || e.includes('unsafe replay')) return 'strict_attestation';
    if (e.includes('gzip') || e.includes('GZIP') || e.includes('canonical JSON')) return 'snapshot_integrity';
    if (e.includes('ADR compliance')) return 'adr_version';
    if (e.includes('Traceability')) return 'traceability';
    if (e.includes('logEntries[') || e.includes('schema')) return 'schema';
    if (e.includes('Index chain') || e.includes('Replay') || e.includes('indexHash')) return 'index_chain';
    if (e.includes('missing') || e.includes('file')) return 'filesystem';
  }
  return 'none';
}

function parseSnapshotClosure(raw: unknown): { auditMode?: 'STRICT' | 'RELAXED'; unsafeReplayUsed: boolean } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { unsafeReplayUsed: false };
  const c = (raw as Record<string, unknown>).sdkClosure;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { unsafeReplayUsed: false };
  const o = c as Record<string, unknown>;
  const auditMode = o.auditMode === 'STRICT' || o.auditMode === 'RELAXED' ? o.auditMode : undefined;
  const unsafeReplayUsed = o.unsafeReplayUsed === true;
  return { auditMode, unsafeReplayUsed };
}

function extractInvariantEnforcement(raw: unknown): InvariantEnforcementResult[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const c = (raw as Record<string, unknown>).sdkClosure;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return [];
  const rows = (c as Record<string, unknown>).invariantEnforcement;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (r) =>
      r &&
      typeof r === 'object' &&
      typeof (r as InvariantEnforcementResult).invariantId === 'string' &&
      ((r as InvariantEnforcementResult).status === 'ENFORCED' ||
        (r as InvariantEnforcementResult).status === 'VIOLATED'),
  ) as InvariantEnforcementResult[];
}

function buildComplianceSection(params: {
  invariantCoverage: InvariantCoverageEntry[];
  valid: boolean;
  auditLevel: SdkAuditLevel;
  primaryClass: SdkFailureClassification;
  invEnf: InvariantEnforcementResult[];
}): ValidationReport['compliance'] {
  const { invariantCoverage, valid, auditLevel, primaryClass, invEnf } = params;
  const failureClassifications: string[] =
    !valid || primaryClass !== 'none' ? [primaryClass] : ['none'];

  let enforcementStatus: 'COMPLETE' | 'PARTIAL' = 'PARTIAL';
  if (auditLevel === 'strict' && valid) enforcementStatus = 'COMPLETE';
  if (auditLevel === 'relaxed' && valid) enforcementStatus = 'PARTIAL';

  const legacyDetail: ValidationReport['compliance']['invariantCoverageDetail'] = Object.freeze(
    invariantCoverage.map((e) => ({
      id: e.id,
      enforcement: e.evidence,
      api: e.enforcementLocation,
      status: e.enforced ? 'enforced' : 'open',
    })),
  );

  return {
    adrVersion: AUDIT_COMPLIANCE_VERSION,
    invariantCoverage,
    legacyInvariantCoverageIds: invariantCoverage.map((e) => e.id),
    invariantCoverageDetail: legacyDetail,
    enforcementStatus,
    failureClassifications,
    failureClassification: primaryClass,
    auditLevel,
    invariantEnforcement: Object.freeze([...invEnf]) as InvariantEnforcementResult[],
  };
}

export function validateAuditSnapshot(
  snapshotPath: string,
  validationCtx?: SdkValidationContext,
): ValidationReport {
  const auditLevel: SdkAuditLevel = validationCtx?.auditLevel ?? 'strict';
  const auditModeUpper: 'STRICT' | 'RELAXED' = auditLevel === 'relaxed' ? 'RELAXED' : 'STRICT';
  const baseAdr = {
    expectedVersion: AUDIT_COMPLIANCE_VERSION,
    snapshotComplianceVersion: undefined as string | undefined,
    aligned: false,
  };

  const abs = path.resolve(snapshotPath);

  const fail = (
    errors: string[],
    rep: string[],
    cls: SdkFailureClassification,
    raw?: unknown,
  ): ValidationReport => {
    const closure = parseSnapshotClosure(raw);
    const invEnf = extractInvariantEnforcement(raw);
    const invariantCoverage = buildCertCoverageRows(invEnf, { snapshotValid: false });
    return deepFreezeSdk({
      valid: false,
      errors,
      report: rep,
      adrCompliance: baseAdr,
      auditMode: closure.auditMode ?? auditModeUpper,
      unsafeReplayUsed: closure.unsafeReplayUsed,
      compliance: buildComplianceSection({
        invariantCoverage,
        valid: false,
        auditLevel,
        primaryClass: cls,
        invEnf,
      }),
    });
  };

  if (!fs.existsSync(abs)) {
    const errors = [`Snapshot file missing: ${abs}`];
    return fail(errors, ['INVALID', ...errors], 'filesystem');
  }

  let txt: string;
  try {
    txt = fs.readFileSync(abs, 'utf8');
  } catch (e) {
    const msg = `Cannot read snapshot: ${(e as Error).message}`;
    return fail([msg], ['INVALID', msg], 'filesystem');
  }

  let parsedForClosure: unknown;
  try {
    parsedForClosure = JSON.parse(txt) as unknown;
  } catch {
    parsedForClosure = undefined;
  }
  const closureEarly = parseSnapshotClosure(parsedForClosure);

  const gzPath = `${abs}.gz`;
  const gzipErrors: string[] = [];
  const verifyGzip = auditLevel === 'strict';
  if (verifyGzip && fs.existsSync(gzPath)) {
    try {
      const expected = gzipAuditPayloadUtf8(txt);
      const actual = fs.readFileSync(gzPath);
      if (Buffer.compare(expected, actual) !== 0) {
        gzipErrors.push('Snapshot gzip sibling does not match canonical JSON UTF-8 bytes');
      }
    } catch (e) {
      gzipErrors.push(`Snapshot gzip verification failed: ${(e as Error).message}`);
    }
  }

  let raw: { complianceVersion?: string };
  try {
    raw = JSON.parse(txt) as { complianceVersion?: string };
  } catch (e) {
    const msg = `Cannot parse snapshot JSON: ${(e as Error).message}`;
    const errors = [...gzipErrors, msg];
    return fail(errors, ['INVALID', ...errors], gzipErrors.length > 0 ? 'snapshot_integrity' : 'schema', parsedForClosure);
  }

  const strictAttestErrors: string[] = [];
  if (auditLevel === 'strict') {
    if (closureEarly.unsafeReplayUsed) {
      strictAttestErrors.push(
        'STRICT attestation rejected: snapshot sdkClosure.unsafeReplayUsed is true (unsafe replay path)',
      );
    }
    if (closureEarly.auditMode === 'RELAXED') {
      strictAttestErrors.push(
        'STRICT attestation: snapshot was emitted under sdkClosure.auditMode RELAXED',
      );
    }
  }

  const result = validateAuditSnapshotPayload(raw, true);
  const snapVer = typeof raw.complianceVersion === 'string' ? raw.complianceVersion : undefined;
  const aligned = snapVer === AUDIT_COMPLIANCE_VERSION;
  const errors = [...strictAttestErrors, ...gzipErrors, ...result.errors];
  if (result.valid && gzipErrors.length === 0 && !aligned) {
    errors.push(
      `ADR compliance: expected complianceVersion "${AUDIT_COMPLIANCE_VERSION}", got ${snapVer === undefined ? '(missing)' : JSON.stringify(snapVer)}`,
    );
  }
  const invEnf = extractInvariantEnforcement(raw);
  const provisionalValid = result.valid && aligned && gzipErrors.length === 0 && strictAttestErrors.length === 0;
  const coverageForGapCheck = buildCertCoverageRows(invEnf, { snapshotValid: provisionalValid });
  const coverageGaps = coverageForGapCheck.some((r) => !r.enforced);
  if (auditLevel === 'strict' && provisionalValid && coverageGaps) {
    errors.push(
      'ADR-003 CERT: strict validation requires every declared invariant row to be enforced (coverage gap)',
    );
  }
  const valid = provisionalValid && !(auditLevel === 'strict' && coverageGaps);

  const report = [
    ...result.report,
    `ADR compliance aligned: ${aligned} (expected ${AUDIT_COMPLIANCE_VERSION})`,
    `auditLevel: ${auditLevel}`,
  ];
  if (fs.existsSync(gzPath)) {
    report.push(`gzip sibling: ${verifyGzip ? (gzipErrors.length === 0 ? 'verified' : 'failed') : 'skipped (relaxed)'}`);
  }
  if (auditLevel === 'relaxed' && fs.existsSync(gzPath)) {
    report.push('RELAXED_AUDIT_NONCOMPLIANT: explicit partial attest — gzip bitwise check skipped');
  }

  const closure = parseSnapshotClosure(raw);
  const primaryClass =
    strictAttestErrors.length > 0 ? 'strict_attestation' : classifyFailure(errors);

  if (!valid) {
    return fail(errors, report, primaryClass, raw);
  }

  const finalCoverage = buildCertCoverageRows(invEnf, { snapshotValid: true });

  return deepFreezeSdk({
    valid: true,
    errors,
    report,
    adrCompliance: {
      expectedVersion: AUDIT_COMPLIANCE_VERSION,
      snapshotComplianceVersion: snapVer,
      aligned,
    },
    auditMode: closure.auditMode ?? auditModeUpper,
    unsafeReplayUsed: closure.unsafeReplayUsed,
    compliance: buildComplianceSection({
      invariantCoverage: finalCoverage,
      valid: true,
      auditLevel,
      primaryClass,
      invEnf,
    }),
  });
}

export function assertReplayBitwiseIdentical(a: LogEntry[], b: LogEntry[]): void {
  const na = normalizeLogEntriesForAudit(a);
  const nb = normalizeLogEntriesForAudit(b);
  if (stableStringify(na) !== stableStringify(nb)) {
    throw new DeterminismViolationError('Replay outputs differ for identical inputs');
  }
}

export function assertReplayTaggedBitwiseIdentical(a: ReplayTaggedEntry[], b: ReplayTaggedEntry[]): void {
  const na = normalizeTaggedReplayForAudit(a);
  const nb = normalizeTaggedReplayForAudit(b);
  if (stableStringify(na) !== stableStringify(nb)) {
    throw new DeterminismViolationError('Tagged replay outputs differ for identical inputs (ordinal / entry graph)');
  }
}

/** Prefer **`snapshotsAuditCanonicallyEqual`** / **`normalizeAuditSnapshot(...,'compare')`** for snapshot objects (ADR-003 CERT). */
export function assertAuditSnapshotsCanonicallyEqual(a: AuditSnapshot, b: AuditSnapshot): void {
  if (!snapshotsAuditCanonicallyEqual(a, b)) {
    throw new DeterminismViolationError('Audit snapshots differ through canonical compare contract');
  }
}

export type CanonicalOrderResponse = {
  orderedEvents: readonly unknown[];
  hash: string;
};

export type ReplayVerifyResponse = {
  match: boolean;
  stateHash: string;
  proof: {
    canonicalEventHash: string;
    decisionSequenceHash: string;
    replayStateHash: string;
  };
};

export type AuditProofResponse = ReplayVerifyResponse['proof'];

export async function getCanonicalOrder(baseUrl: string): Promise<CanonicalOrderResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/cluster/canonical-order`);
  if (!res.ok) throw new Error(`getCanonicalOrder failed: ${res.status}`);
  return (await res.json()) as CanonicalOrderResponse;
}

export async function verifyReplay(baseUrl: string, eventLog: readonly unknown[]): Promise<ReplayVerifyResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/cluster/replay/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventLog }),
  });
  if (!res.ok) throw new Error(`verifyReplay failed: ${res.status}`);
  return (await res.json()) as ReplayVerifyResponse;
}

export async function getAuditProof(baseUrl: string): Promise<AuditProofResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/cluster/audit/proof`);
  if (!res.ok) throw new Error(`getAuditProof failed: ${res.status}`);
  return (await res.json()) as AuditProofResponse;
}
