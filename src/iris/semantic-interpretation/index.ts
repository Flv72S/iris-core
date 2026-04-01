/**
 * Semantic Interpretation — Traduce pattern temporali in significato.
 * Parte di IRIS Core. Importa solo da infra/signal-windowing.
 */

export type { SemanticSignal, SemanticSignalType } from './SemanticSignal';
export type { SemanticRule } from './SemanticRule';
export { SemanticInterpretationEngine } from './SemanticInterpretationEngine';
export {
  SEMANTIC_INTERPRETATION_COMPONENT_ID,
  isSemanticInterpretationEnabled,
  type SemanticInterpretationRegistry,
} from './SemanticInterpretationKillSwitch';
export { focusContextRule } from './rules/FocusContextRule';
export { waitingContextRule } from './rules/WaitingContextRule';
export { overloadContextRule } from './rules/OverloadContextRule';
export { wellbeingRiskRule } from './rules/WellbeingRiskRule';
export { idleContextRule } from './rules/IdleContextRule';
