/**
 * Phase 8.2.1 — Deterministic SafetyRule hash
 *
 * Serializzazione JSON con ordine chiavi stabile; stesso contenuto → stesso hash.
 */

import type { SafetyRule } from './safety-rule.types';

const RULE_KEYS: (keyof Omit<SafetyRule, 'deterministicHash'>)[] = [
  'id',
  'version',
  'description',
  'severity',
  'scope',
  'parameters',
];

function stableStringifyParameters(m: Readonly<Record<string, unknown>>): string {
  const keys = Object.keys(m).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + JSON.stringify(m[k]));
  return '{' + parts.join(',') + '}';
}

function stableStringify(rule: Omit<SafetyRule, 'deterministicHash'>): string {
  const parts: string[] = [];
  for (const k of RULE_KEYS) {
    const v = rule[k];
    if (k === 'parameters' && typeof v === 'object' && v !== null) {
      parts.push(stableStringifyParameters(v));
    } else {
      parts.push(JSON.stringify(v));
    }
  }
  return parts.join('\n');
}

function hashString(s: string): string {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  }
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function computeSafetyRuleHash(
  rule: Omit<SafetyRule, 'deterministicHash'>
): string {
  return hashString(stableStringify(rule));
}
