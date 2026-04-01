/**
 * Phase 12B — Governance Execution Engine.
 * Validates and executes governance actions; produces deterministic execution results.
 */

export type {
  ExecutionResultStatus,
  GovernanceExecutionResult,
} from './execution_result_types.js';
export {
  validateAction,
  executeAction,
  rejectAction,
  sortActionsForExecution,
} from './governance_execution_engine.js';
