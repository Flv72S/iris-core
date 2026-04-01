/**
 * Phase 8.1.3 — Outcome Log Append-Only Model
 */

import type { ActionOutcome } from '../model/outcome.types';

export interface OutcomeLogEntry {
  readonly index: number;
  readonly outcome: ActionOutcome;
  readonly cumulativeHash: string;
}

export interface OutcomeLogSnapshot {
  readonly entries: readonly OutcomeLogEntry[];
  readonly finalHash: string;
}
