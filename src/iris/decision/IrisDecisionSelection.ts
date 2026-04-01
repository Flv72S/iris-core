/**
 * IrisDecisionSelection — IRIS 11.3
 * Dichiarazione di scelta. Non dice cosa fare; solo cosa è stato scelto.
 * Vietato: action, execute, apply, trigger, priority, score, rank, confidence, recommended.
 */

export interface IrisDecisionSelection {
  readonly selectionId: string;
  readonly artifactId: string;
  readonly selectionType: string;
  readonly justification: string;
  readonly derivedAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
