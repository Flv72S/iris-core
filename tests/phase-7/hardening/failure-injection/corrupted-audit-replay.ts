/**
 * Corrupted Audit Replay — Phase 7.V+ Failure Injection
 *
 * Replay con audit modificato; verifica rilevazione mismatch (hash / structural compare).
 */

import type { ExecutionAuditEntry } from '../../../../src/core/execution/audit/ExecutionAuditLog';
import { computeAuditHash } from '../determinism/audit-hash';
import { compareAuditSnapshots } from '../determinism/deep-structural-compare';
import type { StructuralDiff } from '../determinism/deep-structural-compare';

export type CorruptedAuditReplayResult = {
  readonly mismatchDetected: boolean;
  readonly hashMismatch: boolean;
  readonly structuralDiff: StructuralDiff | null;
};

/**
 * Confronta audit "originale" con una versione corrotta (es. una entry modificata).
 * Verifica che computeAuditHash e compareAuditSnapshots rilevino la differenza.
 */
export function runCorruptedAuditReplayScenario(
  originalSnapshot: readonly ExecutionAuditEntry[],
  corruptedSnapshot: readonly ExecutionAuditEntry[]
): CorruptedAuditReplayResult {
  const hashOriginal = computeAuditHash(originalSnapshot);
  const hashCorrupted = computeAuditHash(corruptedSnapshot);
  const hashMismatch = hashOriginal !== hashCorrupted;

  const structuralDiff = compareAuditSnapshots(originalSnapshot, corruptedSnapshot);
  const mismatchDetected = hashMismatch || structuralDiff != null;

  return Object.freeze({
    mismatchDetected,
    hashMismatch,
    structuralDiff: structuralDiff ?? null,
  });
}

/**
 * Crea uno snapshot "corrotto" sostituendo una entry con result diverso.
 */
export function corruptAuditSnapshot(
  snapshot: readonly ExecutionAuditEntry[],
  index: number,
  replaceResult: ExecutionAuditEntry['result']
): ExecutionAuditEntry[] {
  const arr = [...snapshot];
  const entry = arr[index];
  if (entry == null) return arr;
  arr[index] = Object.freeze({
    ...entry,
    result: replaceResult,
  });
  return arr;
}
