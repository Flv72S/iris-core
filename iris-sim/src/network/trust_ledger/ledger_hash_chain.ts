/**
 * Phase 13XX-G — Trust Ledger. Deterministic hash chain (SHA256).
 * 13XX-G-P1: Canonical JSON serialization for deterministic hashing.
 */

import { createHash } from 'node:crypto';
import type { LedgerEntry } from './ledger_entry.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/** Canonical JSON with sorted keys so equivalent data produces identical strings. */
export function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map((key) => {
    const value = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalStringify(value);
  });
  return '{' + entries.join(',') + '}';
}

/** Deterministic payload: entry_id, node_id, type, timestamp, canonical data, previous_hash. */
function payloadString(entry: LedgerEntry): string {
  const dataStr = canonicalStringify(entry.data);
  return [
    entry.entry_id,
    entry.node_id,
    entry.type,
    String(entry.timestamp),
    dataStr,
    entry.previous_hash ?? '',
  ].join('|');
}

export class LedgerHashChain {
  computeEntryHash(entry: LedgerEntry): string {
    return sha256Hex(payloadString(entry));
  }
}
