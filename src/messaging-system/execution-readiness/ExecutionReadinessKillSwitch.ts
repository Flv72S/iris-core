/**
 * ExecutionReadinessKillSwitch - C.4.C
 * Registry per enable/disable. OFF -> verdicts [].
 */

export const EXECUTION_READINESS_COMPONENT_ID = 'execution-readiness';

export type ExecutionReadinessRegistry = Record<string, boolean>;

export function isExecutionReadinessEnabled(registry: ExecutionReadinessRegistry): boolean {
  return registry[EXECUTION_READINESS_COMPONENT_ID] === true;
}
