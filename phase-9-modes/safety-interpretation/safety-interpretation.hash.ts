/**
 * Phase 9.3 — Deterministic hash for safety interpretation
 */

import type { SafetyInterpretation } from './safety-interpretation.types';

const KEYS: (keyof SafetyInterpretation)[] = [
  'baseVerdict',
  'interpretedRiskLevel',
  'recommendedAction',
  'mode',
  'explanation',
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

export function hashSafetyInterpretation(interpretation: SafetyInterpretation): string {
  const str = KEYS.map((k) => JSON.stringify(interpretation[k])).join('\n');
  return hashString(str);
}
