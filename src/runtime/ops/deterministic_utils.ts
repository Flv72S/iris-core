import crypto from 'node:crypto';

import { canonicalizeKeysDeep, stableStringify } from '../../logging/audit';

export function normalizeNumber(n: number): number {
  return Number(n.toFixed(10));
}

function normalizeNumbersDeep(value: unknown): unknown {
  if (typeof value === 'number') return normalizeNumber(value);
  if (Array.isArray(value)) return value.map((x) => normalizeNumbersDeep(x));
  if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) out[k] = normalizeNumbersDeep(o[k]);
    return out;
  }
  return value;
}

export function canonicalSerialize(value: unknown): string {
  return stableStringify(canonicalizeKeysDeep(normalizeNumbersDeep(value)));
}

export function sha256Canonical(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalSerialize(value), 'utf8').digest('hex');
}
