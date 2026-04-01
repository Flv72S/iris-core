import fs from 'node:fs';
import path from 'node:path';

import type { InvariantId, LogEntry, NonDeterministicMarker, OnFailurePolicy } from './types';
import { rotateIfNeeded } from './rotation';
import { enforceRetention } from './retention';
import { validateLogEntry } from './validator';

export type Logger = {
  log(entry: Omit<LogEntry, 'timestamp' | 'correlationId'>): void;
  logInvariant(
    invariantId: InvariantId,
    compliant: boolean,
    metadata?: Record<string, unknown>,
    onFailure?: OnFailurePolicy,
  ): void;
  logNonDeterministic(marker: NonDeterministicMarker, context?: Record<string, unknown>): void;
  flush(): void;
};

/** Optional hooks for SDK/runtime (16F.5); does not change persistence behavior. */
export type LoggerOptions = {
  onAfterEmit?: (entry: Readonly<LogEntry>) => void;
};

function resolveLogDir(): string {
  const envDir = process.env.IRIS_LOG_DIR;
  if (envDir != null && envDir.trim().length > 0) {
    return path.resolve(envDir);
  }
  return path.resolve(process.cwd(), 'artifacts/logs');
}

function envNumber(name: string): number | undefined {
  const raw = process.env[name];
  if (raw == null || raw.trim().length === 0) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function ensureLogDirectory(logDir: string): void {
  fs.mkdirSync(logDir, { recursive: true });
}

function nextCorrelation(counter: number): string {
  return `corr-${String(counter).padStart(6, '0')}`;
}

function mustWriteLine(filePath: string, line: string): void {
  const fd = fs.openSync(filePath, 'a');
  try {
    fs.writeSync(fd, line, undefined, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function mustValidate(entry: LogEntry): void {
  const result = validateLogEntry(entry);
  if (!result.valid) {
    const details = (result.errors ?? []).join('; ');
    throw new Error(`Invalid log entry: ${details}`);
  }
}

function shouldWriteAudit(entry: LogEntry): boolean {
  return entry.invariantId !== undefined || entry.audit.compliant === false || entry.audit.onFailure !== undefined;
}

function runMaintenanceBeforeWrite(type: 'runtime' | 'audit', logDir: string, archiveDir: string): void {
  const maxBytes = envNumber('IRIS_LOG_MAX_BYTES');
  const maxAgeMs = envNumber('IRIS_LOG_MAX_AGE_MS');
  const retentionMs = envNumber('IRIS_LOG_RETENTION_MS');

  const rotated = rotateIfNeeded(type, {
    logDir,
    archiveDir,
    ...(maxBytes === undefined ? {} : { maxBytes }),
    ...(maxAgeMs === undefined ? {} : { maxAgeMs }),
  });
  if (rotated.rotated) {
    enforceRetention({
      logDir,
      archiveDir,
      ...(retentionMs === undefined ? {} : { retentionMs }),
    });
  }
}

export function createLogger(runtimeId: string, options?: LoggerOptions): Logger {
  if (runtimeId.trim().length === 0) {
    throw new Error('runtimeId must be non-empty');
  }

  const logDir = resolveLogDir();
  const runtimeLogPath = path.join(logDir, 'runtime.log.jsonl');
  const auditLogPath = path.join(logDir, 'audit.log.jsonl');
  const archiveDir = path.join(logDir, 'archive');
  ensureLogDirectory(logDir);
  let correlationCounter = 0;

  function emit(entryInput: Omit<LogEntry, 'timestamp' | 'correlationId'>): void {
    correlationCounter += 1;
    const entry: LogEntry = {
      ...entryInput,
      timestamp: new Date().toISOString(),
      correlationId: nextCorrelation(correlationCounter),
    };

    mustValidate(entry);
    options?.onAfterEmit?.(structuredClone(entry) as LogEntry);

    const line = `${JSON.stringify(entry)}\n`;
    runMaintenanceBeforeWrite('runtime', logDir, archiveDir);
    mustWriteLine(runtimeLogPath, line);

    if (shouldWriteAudit(entry)) {
      runMaintenanceBeforeWrite('audit', logDir, archiveDir);
      mustWriteLine(auditLogPath, line);
    }
  }

  return {
    log(entry): void {
      emit({ ...entry, runtimeId });
    },

    logInvariant(invariantId, compliant, metadata, onFailure): void {
      const resolvedOnFailure = compliant ? undefined : (onFailure ?? 'FAIL_FAST');
      emit({
        runtimeId,
        level: compliant ? 'INFO' : 'ERROR',
        phase: 'VALIDATION',
        invariantId,
        message: compliant ? `Invariant ${invariantId} compliant` : `Invariant ${invariantId} non-compliant`,
        metadata: metadata === undefined ? { invariantId } : { invariantId, context: metadata },
        audit: {
          compliant,
          ...(resolvedOnFailure === undefined ? {} : { onFailure: resolvedOnFailure }),
        },
      });
    },

    logNonDeterministic(marker, context): void {
      emit({
        runtimeId,
        level: 'DEBUG',
        phase: 'RUNTIME',
        nondeterministicMarker: marker,
        message: `Non-deterministic observation ${marker}`,
        ...(context === undefined ? {} : { metadata: context }),
        audit: {
          compliant: true,
        },
      });
    },

    flush(): void {
      // appendFileSync is synchronous, so writes are already flushed at call boundary.
      ensureLogDirectory(logDir);
    },
  };
}

