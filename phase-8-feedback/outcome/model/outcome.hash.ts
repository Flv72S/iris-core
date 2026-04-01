/**
 * Phase 8.1.1 — Deterministic Outcome Hash
 *
 * Serializzazione JSON con ordinamento chiavi stabile; hash deterministico.
 * Stesso payload → stesso hash byte-level. Nessun timestamp corrente o random.
 */

import type { ActionOutcome } from './outcome.types';

const PAYLOAD_KEYS: (keyof Omit<ActionOutcome, 'deterministicHash'>)[] = [
  'id',
  'actionIntentId',
  'status',
  'source',
  'timestamp',
  'metadata',
];

function stableStringifyMetadata(m: Record<string, unknown>): string {
  const keys = Object.keys(m).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + JSON.stringify(m[k]));
  return '{' + parts.join(',') + '}';
}

function stableStringify(obj: Omit<ActionOutcome, 'deterministicHash'>): string {
  const parts: string[] = [];
  for (const k of PAYLOAD_KEYS) {
    const v = obj[k];
    if (k === 'metadata' && typeof v === 'object' && v !== null && !Array.isArray(v)) {
      parts.push(stableStringifyMetadata(v as Record<string, unknown>));
    } else {
      parts.push(JSON.stringify(v));
    }
  }
  return parts.join('\n');
}

/**
 * Calcola hash deterministico del payload (SHA-256 in Node).
 * Stesso payload → stesso hash sempre.
 */
export function computeOutcomeHash(
  payload: Omit<ActionOutcome, 'deterministicHash'>
): string {
  const str = stableStringify(payload);
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
  }
  return simpleStableHash(str);
}

function simpleStableHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}
