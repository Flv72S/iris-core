/**
 * ExecutionStepResult — C.3
 * Esito di un singolo step. Solo stato tecnico; nessuna semantic evaluation, scoring, suggestion, decision.
 */

export type ExecutionStepStatus = 'success' | 'failure' | 'partial';

export interface ExecutionStepResult {
  readonly stepId: string;
  readonly status: ExecutionStepStatus;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}
