/**
 * SemanticMemory — 8.1.2 §3.4
 * Uso controllato di storico o tempo.
 *
 * Contratto: isolato dalla Fase 7; NON modifica limiti 7.6; sempre invalidabile.
 */

export interface TimeWindow {
  readonly from: number;
  readonly to: number;
}

/** Identificatore di funzione di decadimento (es. "linear", "exp"). */
export type DecayFunction = string;

/**
 * SemanticMemory — forma vincolante 8.1.2.
 * resettable MUST be true.
 */
export interface SemanticMemory {
  readonly window: TimeWindow;
  readonly decay?: DecayFunction;
  readonly resettable: true;
}

export const SEMANTIC_MEMORY_CONTRACT =
  'SemanticMemory is isolated from Phase 7; MUST NOT modify 7.6 limits; MUST be invalidatable.';
