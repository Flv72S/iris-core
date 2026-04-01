/**
 * Phase 11A — Deterministic hashing for consensus artifacts.
 */

import { createHash } from 'node:crypto';

export function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Deterministic hash of a JSON-serializable value. Order of keys is not guaranteed by JSON.stringify;
 * for objects we sort keys when stringifying to ensure determinism.
 */
export function hashConsensusPayload(obj: unknown): string {
  const str = stableStringify(obj);
  return sha256Hex(str);
}

function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}
