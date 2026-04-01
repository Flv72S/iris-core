/**
 * Execution Readiness - C.4.C
 * Determina se un Action Plan e' eseguibile, bloccato o richiede conferma. Nessuna esecuzione reale.
 */

export { EXECUTION_READINESS_STATUS, type ExecutionReadinessStatus } from './ExecutionReadinessStatus';
export { EXECUTION_SAFETY_FLAGS, type ExecutionSafetyFlag } from './ExecutionSafetyFlag';
export type { ExecutionReadinessVerdict } from './ExecutionReadinessVerdict';
export type { ExecutionReadinessSnapshot } from './ExecutionReadinessSnapshot';
export type { ExecutionReadinessEvaluator } from './ExecutionReadinessEvaluator';
export {
  EXECUTION_READINESS_COMPONENT_ID,
  isExecutionReadinessEnabled,
  type ExecutionReadinessRegistry,
} from './ExecutionReadinessKillSwitch';
export { ExecutionReadinessEngine } from './ExecutionReadinessEngine';
