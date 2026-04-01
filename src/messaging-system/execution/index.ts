/**
 * Execution Engine — C.4
 * Unico punto con side-effect reali. Solo piani READY, solo adapter dichiarati.
 */

export { EXECUTION_STATUS, type ExecutionStatus } from './ExecutionStatus';
export type { ExecutionResult } from './ExecutionResult';
export {
  EXECUTION_ENGINE_COMPONENT_ID,
  isExecutionEnabled,
  type ExecutionRegistry,
} from './ExecutionKillSwitch';
export type { ExecutionAdapterRegistry } from './ExecutionAdapterRegistry';
export type { ExecutableActionPlanSnapshot } from './ExecutableActionPlanSnapshot';
export { ExecutionEngine } from './ExecutionEngine';
