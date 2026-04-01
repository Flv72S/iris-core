/**
 * ExecutionResultSnapshot — C.5
 * Forma dichiarativa dell'input da execution. Solo tipi da execution-boundary.
 */

import type { ExecutionStepResult } from '../execution-boundary/ExecutionStepResult';

/**
 * Snapshot dei risultati di esecuzione consumati dal Feedback Boundary.
 * Compatibile con execution-boundary.ExecutionResult e con l'output dell'Execution Engine (C.4).
 */
export interface ExecutionResultSnapshot {
  readonly executionId: string;
  readonly results: readonly ExecutionStepResult[];
  readonly completedAt: string;
  readonly planId?: string;
  readonly status?: string;
}
