/**
 * SemanticPolicy — 8.1.2 §3.6
 * Governance semantica sopra i limiti tecnici (overlay di safety).
 *
 * Contratto: NON sostituisce 7.6; NON autorizza ciò che 7.6 vieta; degrada sempre verso 7.6.
 */

/** Condizione sotto cui la policy si applica. */
export type SemanticCondition = string;

/** Riferimento al limite tecnico di fallback (7.6). */
export type TechnicalLimit = string;

/**
 * SemanticPolicy — forma vincolante 8.1.2.
 */
export interface SemanticPolicy {
  readonly appliesIf: SemanticCondition;
  readonly fallback: TechnicalLimit;
}

export const SEMANTIC_POLICY_CONTRACT =
  'SemanticPolicy MUST NOT replace or bypass 7.6; MUST always degrade to technical limit.';
