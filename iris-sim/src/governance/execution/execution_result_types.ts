/**
 * Phase 12B — Governance Execution Engine. Execution result types.
 * All types are immutable and JSON-safe.
 */

/** Status of an execution attempt. */
export type ExecutionResultStatus =
  | 'EXECUTION_ACCEPTED'
  | 'EXECUTION_REJECTED'
  | 'EXECUTION_FAILED';

/** Result of executing (or rejecting) a governance action. Immutable, deterministic. */
export interface GovernanceExecutionResult {
  readonly action_id: string;
  readonly executor_id: string;
  readonly status: ExecutionResultStatus;
  readonly execution_timestamp: number;
  readonly result_metadata: Record<string, unknown>;
}
