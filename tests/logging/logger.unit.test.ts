import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createLogger } from '../../src/logging/logger';
import { validateLogEntry } from '../../src/logging/validator';

const LOG_DIR = path.resolve(process.cwd(), 'artifacts/logs');
const RUNTIME_LOG_PATH = path.join(LOG_DIR, 'runtime.log.jsonl');
const AUDIT_LOG_PATH = path.join(LOG_DIR, 'audit.log.jsonl');

function readLines(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (raw.length === 0) return [];
  return raw.split('\n');
}

function readEntriesForRuntime(filePath: string, runtimeId: string): any[] {
  return readLines(filePath)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((entry) => entry.runtimeId === runtimeId);
}

describe('logger runtime unit', () => {
  it('creates logger instance', () => {
    const logger = createLogger('ut-create');
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.logInvariant).toBe('function');
    expect(typeof logger.logNonDeterministic).toBe('function');
    expect(typeof logger.flush).toBe('function');
  });

  it('writes basic log as valid JSON entry', () => {
    const runtimeId = `ut-basic-${Date.now()}`;
    const logger = createLogger(runtimeId);
    logger.log({
      runtimeId,
      level: 'INFO',
      phase: 'INIT',
      message: 'boot',
      audit: { compliant: true },
    });

    const entries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    expect(entries.length).toBe(1);
    const result = validateLogEntry(entries[0]);
    expect(result.valid).toBe(true);
  });

  it('enforces schema validation and throws on invalid log', () => {
    const runtimeId = `ut-invalid-${Date.now()}`;
    const logger = createLogger(runtimeId);
    expect(() =>
      logger.log({
        runtimeId,
        level: 'TRACE' as any,
        phase: 'RUNTIME',
        message: 'invalid',
        audit: { compliant: true },
      }),
    ).toThrowError(/Invalid log entry/);
  });

  it('increments correlationId deterministically', () => {
    const runtimeId = `ut-corr-${Date.now()}`;
    const logger = createLogger(runtimeId);
    logger.log({
      runtimeId,
      level: 'INFO',
      phase: 'INIT',
      message: 'a',
      audit: { compliant: true },
    });
    logger.log({
      runtimeId,
      level: 'INFO',
      phase: 'RUNTIME',
      message: 'b',
      audit: { compliant: true },
    });

    const entries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    expect(entries.length).toBe(2);
    expect(entries[0]?.correlationId).toBe('corr-000001');
    expect(entries[1]?.correlationId).toBe('corr-000002');
  });

  it('applies audit filtering logic', () => {
    const runtimeId = `ut-audit-${Date.now()}`;
    const logger = createLogger(runtimeId);
    logger.log({
      runtimeId,
      level: 'DEBUG',
      phase: 'RUNTIME',
      message: 'no audit filtering trigger',
      audit: { compliant: true },
    });
    logger.log({
      runtimeId,
      level: 'ERROR',
      phase: 'VALIDATION',
      invariantId: 'INV-001',
      message: 'invariant',
      audit: { compliant: false, onFailure: 'FAIL_FAST' },
    });

    const runtimeEntries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    const auditEntries = readEntriesForRuntime(AUDIT_LOG_PATH, runtimeId);
    expect(runtimeEntries.length).toBe(2);
    expect(auditEntries.length).toBe(1);
    expect(auditEntries[0]?.invariantId).toBe('INV-001');
  });

  it('logInvariant builds compliant validation entry', () => {
    const runtimeId = `ut-inv-${Date.now()}`;
    const logger = createLogger(runtimeId);
    logger.logInvariant('INV-012', true, { source: 'unit' });

    const entries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    expect(entries.length).toBe(1);
    const e = entries[0];
    expect(e.phase).toBe('VALIDATION');
    expect(e.level).toBe('INFO');
    expect(e.invariantId).toBe('INV-012');
    expect(e.audit?.compliant).toBe(true);
    expect(e.metadata?.invariantId).toBe('INV-012');
  });

  it('logNonDeterministic builds ND-aware entry', () => {
    const runtimeId = `ut-nd-${Date.now()}`;
    const logger = createLogger(runtimeId);
    logger.logNonDeterministic('ND-004', { source: 'unit' });

    const entries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    expect(entries.length).toBe(1);
    const e = entries[0];
    expect(e.phase).toBe('RUNTIME');
    expect(e.level).toBe('DEBUG');
    expect(e.nondeterministicMarker).toBe('ND-004');
    expect(e.audit?.compliant).toBe(true);

    const auditEntries = readEntriesForRuntime(AUDIT_LOG_PATH, runtimeId);
    expect(auditEntries.length).toBe(0);
  });
});

