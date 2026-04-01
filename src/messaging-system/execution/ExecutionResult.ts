/**
 * ExecutionResult — C.4
 * Risultato esecuzione. Frozen, auditabile, serializzabile.
 */

import type { ExecutionStatus } from './ExecutionStatus';
import type { ExecutionStepResult } from '../execution-boundary/ExecutionStepResult';

export interface ExecutionResult {
  readonly executionId: string;
  readonly planId: string;
  readonly status: ExecutionStatus;
  readonly steps: readonly ExecutionStepResult[];
  readonly executedAt: string;
}
