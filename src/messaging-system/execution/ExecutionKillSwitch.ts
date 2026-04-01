/**
 * ExecutionKillSwitch — C.4
 * Kill-switch globale. OFF → nessuna esecuzione, risultato SKIPPED.
 */

export const EXECUTION_ENGINE_COMPONENT_ID = 'messaging-execution-engine';

export type ExecutionRegistry = Record<string, boolean>;

export function isExecutionEnabled(registry: ExecutionRegistry): boolean {
  return registry[EXECUTION_ENGINE_COMPONENT_ID] === true;
}
