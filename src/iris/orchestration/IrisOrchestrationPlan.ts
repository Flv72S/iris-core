/**
 * IrisOrchestrationPlan — IRIS 9.1
 * Dichiarazione di cosa attivare; NON decisione.
 */

export interface IrisOrchestrationPlan {
  readonly id: string;
  readonly description?: string;
  readonly enabledInterpreters: readonly string[];
  readonly enabledPipelines: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}
