/**
 * ExecutionReadinessStatus - C.4.C
 * Stato di prontezza all'esecuzione. Puramente dichiarativo.
 */

export const EXECUTION_READINESS_STATUS = [
  'READY',
  'REQUIRES_CONFIRMATION',
  'BLOCKED',
] as const;

export type ExecutionReadinessStatus = (typeof EXECUTION_READINESS_STATUS)[number];
