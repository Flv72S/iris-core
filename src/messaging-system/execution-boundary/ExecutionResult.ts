/**
 * ExecutionResult — C.3
 * Esito complessivo dell'esecuzione. Non influenza IRIS né piani.
 */

import type { ExecutionStepResult } from './ExecutionStepResult';

export interface ExecutionResult {
  readonly executionId: string;
  readonly results: readonly ExecutionStepResult[];
  readonly completedAt: string;
}
