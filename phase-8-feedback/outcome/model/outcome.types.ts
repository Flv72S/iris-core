/**
 * Phase 8.1.1 — Outcome Data Model
 *
 * Modello dati deterministico degli Outcome delle azioni.
 * Completamente readonly, serializzabile JSON, ordinamento proprietà stabile.
 * Nessun learning, nessuna modifica al runtime Phase 7.
 */

export type OutcomeStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'REVERTED'
  | 'IGNORED';

export type OutcomeSource =
  | 'EXECUTION_RUNTIME'
  | 'USER_OVERRIDE'
  | 'SYSTEM_ABORT';

export interface ActionOutcome {
  readonly id: string;
  readonly actionIntentId: string;
  readonly status: OutcomeStatus;
  readonly source: OutcomeSource;
  readonly timestamp: number;
  readonly metadata: Record<string, unknown>;
  readonly deterministicHash: string;
}
