/**
 * ExecutionStatus — C.5 Feedback Boundary
 * Valori ammessi per lo stato osservato. SUCCESS | FAILURE | PARTIAL | UNKNOWN.
 */

export const EXECUTION_FEEDBACK_STATUS = [
  'SUCCESS',
  'FAILURE',
  'PARTIAL',
  'UNKNOWN',
] as const;

export type ExecutionStatus = (typeof EXECUTION_FEEDBACK_STATUS)[number];
