/**
 * Phase 8.1.2 — Outcome Classification Engine
 *
 * Riceve ActionOutcome, produce OutcomeClassification deterministica.
 * Funzione pura, replay-safe, side-effect free.
 * Hash deterministico con serializzazione stabile (stesso schema 8.1.1).
 */

import type { ActionOutcome } from '../model/outcome.types';
import type { OutcomeClassification } from './outcome-classification.types';
import { classifyOutcomeSemantics } from './outcome-classification.rules';

const CLASSIFICATION_KEYS: (keyof Omit<OutcomeClassification, 'deterministicHash'>)[] = [
  'outcomeId',
  'semanticClass',
  'severity',
  'recoverable',
];

function stableStringifyClassification(
  payload: Omit<OutcomeClassification, 'deterministicHash'>
): string {
  const parts = CLASSIFICATION_KEYS.map((k) => JSON.stringify(payload[k]));
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

function computeOutcomeClassificationHash(
  payload: Omit<OutcomeClassification, 'deterministicHash'>
): string {
  return hashString(stableStringifyClassification(payload));
}

/**
 * Classifica un outcome in modo deterministico.
 * Stesso outcome → stessa classificazione e stesso hash.
 */
export function classifyOutcome(outcome: ActionOutcome): OutcomeClassification {
  const partial = classifyOutcomeSemantics(outcome);
  const deterministicHash = computeOutcomeClassificationHash(partial);
  const result: OutcomeClassification = Object.freeze({
    ...partial,
    deterministicHash,
  });
  return result;
}
