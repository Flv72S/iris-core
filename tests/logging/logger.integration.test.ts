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

describe('logger runtime integration', () => {
  it('Scenario 1: full lifecycle ordering and valid JSONL output', () => {
    const runtimeId = `it-life-${Date.now()}`;
    const logger = createLogger(runtimeId);

    logger.log({
      runtimeId,
      level: 'INFO',
      phase: 'INIT',
      message: 'init start',
      audit: { compliant: true },
    });
    logger.log({
      runtimeId,
      level: 'DEBUG',
      phase: 'RUNTIME',
      message: 'runtime step',
      audit: { compliant: true },
    });
    logger.log({
      runtimeId,
      level: 'INFO',
      phase: 'SNAPSHOT',
      message: 'snapshot saved',
      audit: { compliant: true },
    });
    logger.logInvariant('INV-004', true, { step: 'validation' });
    logger.flush();

    const runtimeEntries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    expect(runtimeEntries.length).toBe(4);
    expect(runtimeEntries.map((e) => e.phase)).toEqual(['INIT', 'RUNTIME', 'SNAPSHOT', 'VALIDATION']);
    expect(runtimeEntries.map((e) => e.correlationId)).toEqual([
      'corr-000001',
      'corr-000002',
      'corr-000003',
      'corr-000004',
    ]);
    for (const entry of runtimeEntries) {
      expect(validateLogEntry(entry).valid).toBe(true);
    }
  });

  it('Scenario 2: invariant failure is persisted in runtime and audit logs', () => {
    const runtimeId = `it-fail-${Date.now()}`;
    const logger = createLogger(runtimeId);

    logger.logInvariant('INV-014', false, { reason: 'phase failure' }, 'FAIL_FAST');

    const runtimeEntries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    const auditEntries = readEntriesForRuntime(AUDIT_LOG_PATH, runtimeId);

    expect(runtimeEntries.length).toBe(1);
    expect(auditEntries.length).toBe(1);
    expect(runtimeEntries[0]?.audit?.onFailure).toBe('FAIL_FAST');
    expect(auditEntries[0]?.audit?.onFailure).toBe('FAIL_FAST');
  });

  it('Scenario 3: ND events ND-001..ND-006 are runtime-only', () => {
    const runtimeId = `it-nd-${Date.now()}`;
    const logger = createLogger(runtimeId);
    const markers = ['ND-001', 'ND-002', 'ND-003', 'ND-004', 'ND-005', 'ND-006'] as const;

    for (const marker of markers) {
      logger.logNonDeterministic(marker, { marker });
    }

    const runtimeEntries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    const auditEntries = readEntriesForRuntime(AUDIT_LOG_PATH, runtimeId);

    expect(runtimeEntries.length).toBe(6);
    expect(runtimeEntries.map((e) => e.nondeterministicMarker)).toEqual(markers);
    expect(auditEntries.length).toBe(0);
  });

  it('Scenario 4 + 5: replayability and full schema compatibility', () => {
    const runtimeId = `it-replay-${Date.now()}`;
    const logger = createLogger(runtimeId);

    logger.log({
      runtimeId,
      level: 'INFO',
      phase: 'INIT',
      message: 'bootstrap',
      audit: { compliant: true },
    });
    logger.logInvariant('INV-011', true, { section: 'replay' });
    logger.logNonDeterministic('ND-001', { clock: 'wall' });

    const runtimeEntries = readEntriesForRuntime(RUNTIME_LOG_PATH, runtimeId);
    expect(runtimeEntries.length).toBe(3);

    for (const entry of runtimeEntries) {
      const validation = validateLogEntry(entry);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    }
  });
});

