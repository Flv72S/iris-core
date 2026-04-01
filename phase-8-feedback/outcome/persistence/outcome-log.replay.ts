/**
 * Phase 8.1.3 — Deterministic Outcome Log Replay
 *
 * Ricostruisce log da zero; stesso finalHash; nessun side-effect; puro.
 */

import type { ActionOutcome } from '../model/outcome.types';
import type { OutcomeLogEntry, OutcomeLogSnapshot } from './outcome-log.types';
import {
  computeCumulativeOutcomeHash,
  getInitialChainHash,
} from './outcome-log.hash';

export function replayOutcomeLog(
  outcomes: readonly ActionOutcome[]
): OutcomeLogSnapshot {
  const entries: OutcomeLogEntry[] = [];
  let currentHash = getInitialChainHash();
  for (let i = 0; i < outcomes.length; i++) {
    const outcome = outcomes[i];
    currentHash = computeCumulativeOutcomeHash(currentHash, outcome, i);
    entries.push(
      Object.freeze({
        index: i,
        outcome,
        cumulativeHash: currentHash,
      })
    );
  }
  return Object.freeze({
    entries: Object.freeze(entries) as readonly OutcomeLogEntry[],
    finalHash: currentHash,
  });
}
