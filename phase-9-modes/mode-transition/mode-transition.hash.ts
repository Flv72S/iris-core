/**
 * Phase 9.4 — Deterministic hash for mode transition event
 */

import type { ModeTransitionEvent } from './mode-transition.types';

const KEYS: (keyof ModeTransitionEvent)[] = [
  'from',
  'to',
  'stage',
  'initiatedAt',
  'effectiveAt',
  'rationale',
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

export function hashModeTransitionEvent(event: ModeTransitionEvent): string {
  const str = KEYS.map((k) => JSON.stringify(event[k])).join('\n');
  return hashString(str);
}
