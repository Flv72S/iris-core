/**
 * IrisDecisionEvaluation — IRIS 11.2
 * Note di valutazione puramente dichiarative. Annotazione, non giudizio finale.
 * Vietato: best, recommended, priority, score, rank, selected, confidence.
 */

export interface IrisDecisionEvaluationNote {
  readonly id: string;
  readonly artifactId: string;
  readonly evaluationType: string;
  readonly observation: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
