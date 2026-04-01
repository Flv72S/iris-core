/**
 * ExecutionSemanticsKillSwitch - C.4.B
 * Registry standard. OFF -> snapshot vuoto.
 */

export const EXECUTION_SEMANTICS_COMPONENT_ID = 'execution-semantics';

export interface ExecutionSemanticsRegistry {
  isEnabled(componentId: string): boolean;
}

export function isExecutionSemanticsEnabled(registry: ExecutionSemanticsRegistry): boolean {
  return registry.isEnabled(EXECUTION_SEMANTICS_COMPONENT_ID);
}
