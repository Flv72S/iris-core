/**
 * Phase 11B — Deterministic hashing for registry artifacts.
 * Reuses approach from Node Consensus Engine (stableStringify + SHA-256).
 */

import { createHash } from 'node:crypto';

export function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function hashRegistryPayload(obj: unknown): string {
  return sha256Hex(stableStringify(obj));
}

function stableStringify(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}
