/**
 * Phase 8.1.2 — Outcome Classification Data Model
 *
 * Modello deterministico della classificazione semantica degli outcome.
 * Tutto readonly, severity ∈ [0,1], serializzabile JSON.
 * Nessun learning, nessuna modifica al runtime Phase 7.
 */

export type OutcomeSemanticClass =
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'NEUTRAL'
  | 'RECOVERED';

export interface OutcomeClassification {
  readonly outcomeId: string;
  readonly semanticClass: OutcomeSemanticClass;
  readonly severity: number;
  readonly recoverable: boolean;
  readonly deterministicHash: string;
}
