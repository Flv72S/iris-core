/**
 * Phase 8.1.1 — Pure Outcome Factory
 *
 * Funzione pura: nessuna side-effect, nessuna generazione automatica di ID o tempo.
 * Default metadata = {} congelato. Hash delegato a outcome.hash.
 */

import type { ActionOutcome, OutcomeStatus, OutcomeSource } from './outcome.types';
import { computeOutcomeHash } from './outcome.hash';

const EMPTY_METADATA: Record<string, unknown> = Object.freeze({});

export function createActionOutcome(input: {
  readonly id: string;
  readonly actionIntentId: string;
  readonly status: OutcomeStatus;
  readonly source: OutcomeSource;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}): ActionOutcome {
  const metadata = Object.freeze(input.metadata ?? EMPTY_METADATA);
  const payload = {
    id: input.id,
    actionIntentId: input.actionIntentId,
    status: input.status,
    source: input.source,
    timestamp: input.timestamp,
    metadata,
  };
  const deterministicHash = computeOutcomeHash(payload);
  return Object.freeze({
    ...payload,
    metadata,
    deterministicHash,
  });
}
