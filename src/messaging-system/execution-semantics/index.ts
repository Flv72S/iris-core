/**
 * Execution Semantics - C.4.B
 * Descrive COME un Action Plan potrebbe essere eseguito, senza eseguire nulla.
 */

export type { ExecutionSemanticRequirement } from './ExecutionSemanticRequirement';
export type {
  ExecutionSemanticBlocker,
  ExecutionSemanticBlockerReason,
} from './ExecutionSemanticBlocker';
export { EXECUTION_SEMANTIC_BLOCKER_REASONS } from './ExecutionSemanticBlocker';
export type {
  ExecutionSemanticHint,
  ExecutionSemanticHintType,
} from './ExecutionSemanticHint';
export { EXECUTION_SEMANTIC_HINT_TYPES } from './ExecutionSemanticHint';
export type { ExecutionSemanticSnapshot } from './ExecutionSemanticSnapshot';
export {
  EXECUTION_SEMANTICS_COMPONENT_ID,
  isExecutionSemanticsEnabled,
  type ExecutionSemanticsRegistry,
} from './ExecutionSemanticsKillSwitch';
export { ExecutionSemanticsResolver } from './ExecutionSemanticsResolver';
