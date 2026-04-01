/**
 * Audit Hash — Phase 7.V+
 *
 * Hash stabile per audit snapshot: stesso input → stesso hash.
 * Stabile tra replay per verificabilità.
 */

import type { ExecutionAuditEntry } from '../../../../src/core/execution/audit/ExecutionAuditLog';

export type AuditHash = string;

/** Chiavi in ordine canonico per serializzazione deterministica. */
const ENTRY_KEYS: (keyof ExecutionAuditEntry)[] = [
  'actionId',
  'type',
  'sourceFeature',
  'requestedAt',
  'result',
];

function resultToCanonical(obj: ExecutionAuditEntry['result']): string {
  if (obj.status === 'EXECUTED') {
    return JSON.stringify({ status: obj.status, executedAt: obj.executedAt });
  }
  return JSON.stringify({ status: obj.status, reason: obj.reason });
}

function entryToCanonical(entry: ExecutionAuditEntry): string {
  const parts: string[] = [];
  for (const k of ENTRY_KEYS) {
    const v = entry[k];
    if (k === 'result') {
      parts.push(resultToCanonical(v as ExecutionAuditEntry['result']));
    } else {
      parts.push(JSON.stringify(v));
    }
  }
  return parts.join('|');
}

/**
 * Calcola un hash stabile per l'intero snapshot.
 * Stesso snapshot → stesso hash. Nessuna dipendenza da Date.now() o random.
 */
export function computeAuditHash(snapshot: readonly ExecutionAuditEntry[]): AuditHash {
  const parts = snapshot.map((e) => entryToCanonical(e));
  const canonical = parts.join('\n');
  return simpleStableHash(canonical);
}

/**
 * Hash deterministico semplice (djb2-style). Per ambiente test senza crypto.
 * In produzione si può sostituire con SHA-256 del canonical.
 */
function simpleStableHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/**
 * Verifica che due snapshot producano lo stesso hash (consistenza replay).
 */
export function verifyAuditHashConsistency(
  original: readonly ExecutionAuditEntry[],
  replay: readonly ExecutionAuditEntry[]
): boolean {
  return computeAuditHash(original) === computeAuditHash(replay);
}
