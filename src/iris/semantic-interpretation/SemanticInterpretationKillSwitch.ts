/**
 * SemanticInterpretationKillSwitch — OFF → restituisce [].
 */

export const SEMANTIC_INTERPRETATION_COMPONENT_ID = 'semantic-interpretation';

export type SemanticInterpretationRegistry = Record<string, boolean>;

export function isSemanticInterpretationEnabled(
  registry: SemanticInterpretationRegistry
): boolean {
  return registry[SEMANTIC_INTERPRETATION_COMPONENT_ID] !== false;
}
