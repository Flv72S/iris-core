/**
 * SemanticKillSwitch — 8.2.0
 * Meccanismo centrale per disattivare l'intero SemanticEngine e ogni SemanticModule.
 * In stato OFF: SemanticEngine restituisce snapshot vuoto; sistema = Fase 7 pura.
 */

import type { Phase8ComponentId, Phase8KillSwitchRegistry } from '../contracts';

/** Id del Semantic Engine nel registry. Quando disabilitato, engine restituisce snapshot vuoto. */
export const SEMANTIC_ENGINE_COMPONENT_ID: Phase8ComponentId = 'semantic-engine';

/** Id del ranking 8.2.2. Quando disabilitato, nessun ordinamento; snapshot equivalente a 8.2.1. */
export const SEMANTIC_RANKING_COMPONENT_ID: Phase8ComponentId = 'semantic-ranking';

/** Id dello strato explanation/suggestions 8.2.3. Quando disabilitato, snapshot con explanations: []. */
export const SEMANTIC_EXPLANATIONS_COMPONENT_ID: Phase8ComponentId = 'semantic-explanations';

/**
 * Verifica se il Semantic Engine è abilitato tramite il registry.
 * Quando false, l'engine MUST restituire sempre snapshot vuoto.
 */
export function isSemanticEngineEnabled(registry: Phase8KillSwitchRegistry): boolean {
  return registry.isEnabled(SEMANTIC_ENGINE_COMPONENT_ID);
}

/**
 * Verifica se l'ordinamento 8.2.2 è abilitato. Quando false, nessun ranking applicato; snapshot come 8.2.1.
 */
export function isRankingEnabled(registry: Phase8KillSwitchRegistry): boolean {
  return registry.isEnabled(SEMANTIC_RANKING_COMPONENT_ID);
}

/**
 * Verifica se lo strato explanation/suggestions 8.2.3 è abilitato. Quando false, snapshot con explanations: [].
 */
export function isExplanationsEnabled(registry: Phase8KillSwitchRegistry): boolean {
  return registry.isEnabled(SEMANTIC_EXPLANATIONS_COMPONENT_ID);
}
