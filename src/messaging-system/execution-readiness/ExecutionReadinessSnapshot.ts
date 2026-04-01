/**
 * ExecutionReadinessSnapshot - C.4.C
 * Snapshot immutabile dei verdetti di prontezza.
 */

import type { ExecutionReadinessVerdict } from './ExecutionReadinessVerdict';

export interface ExecutionReadinessSnapshot {
  readonly verdicts: readonly ExecutionReadinessVerdict[];
  readonly derivedAt: string;
}
