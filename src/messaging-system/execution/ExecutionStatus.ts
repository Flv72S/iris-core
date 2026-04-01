/**
 * ExecutionStatus — C.4
 * Esito complessivo dell'esecuzione. SUCCESS | FAILED | SKIPPED.
 */

export const EXECUTION_STATUS = ['SUCCESS', 'FAILED', 'SKIPPED'] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUS)[number];
