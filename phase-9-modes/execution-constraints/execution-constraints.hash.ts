/**
 * Phase 9.2 — Deterministic hash for execution constraints
 */

import type { ExecutionConstraints } from './execution-constraints.types';

const KEYS: (keyof ExecutionConstraints)[] = [
  'maxActions',
  'allowParallelActions',
  'interruptionTolerance',
  'proactiveActionAllowed',
  'metadata',
];

function hashString(s: string): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  }
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function stableStringify(c: ExecutionConstraints): string {
  return KEYS.map((k) => JSON.stringify(c[k])).join('\n');
}

export function hashExecutionConstraints(constraints: ExecutionConstraints): string {
  return hashString(stableStringify(constraints));
}
