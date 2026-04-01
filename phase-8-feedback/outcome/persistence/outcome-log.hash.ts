/**
 * Phase 8.1.3 — Cumulative Outcome Log Hash
 *
 * Hash deterministico (SHA-256); serializzazione stabile.
 * Stesso log → stesso hash byte-level; cambiando un outcome → cambia hash finale.
 */

import type { ActionOutcome } from '../model/outcome.types';

const INITIAL_CHAIN_HASH = '';

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

/**
 * Serializzazione stabile per un passo della catena: previousHash + outcome.deterministicHash + index.
 */
export function computeCumulativeOutcomeHash(
  previousHash: string,
  outcome: ActionOutcome,
  index: number
): string {
  const payload = `${previousHash}\n${outcome.deterministicHash}\n${index}`;
  return hashString(payload);
}

export function getInitialChainHash(): string {
  return INITIAL_CHAIN_HASH;
}
