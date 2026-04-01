/**
 * IrisOrchestrationKillSwitch — IRIS 9.1
 * Kill-switch locale alla Fase 9. Se OFF, orchestrate() restituisce [].
 */

export const IRIS_ORCHESTRATION_COMPONENT_ID = 'iris-orchestration';

/**
 * Registry minimale: consente di verificare se l'orchestrazione è abilitata.
 * Può essere implementato da Phase8KillSwitchRegistry o da un registry prodotto.
 */
export interface OrchestrationRegistry {
  isEnabled(componentId: string): boolean;
}

export function isOrchestrationEnabled(registry: OrchestrationRegistry): boolean {
  return registry.isEnabled(IRIS_ORCHESTRATION_COMPONENT_ID);
}
