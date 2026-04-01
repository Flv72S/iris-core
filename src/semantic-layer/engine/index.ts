/**
 * Semantic Engine — 8.2.0 Skeleton + 8.2.1 Aggregation Contract
 * Modulo centrale; aggregazione append-only; kill-switch obbligatorio.
 */

export type { SemanticInput } from './SemanticInput';
export {
  type SemanticSnapshot,
  createEmptySnapshot,
  isEmptySnapshot,
} from './SemanticSnapshot';
export type { SemanticModule } from './SemanticModule';
export {
  type SemanticModuleOutput,
  isModuleOutputShape,
} from './SemanticModuleOutput';
export {
  aggregate,
  type IsModuleEnabled,
  type AggregateOptions,
} from './SemanticAggregator';
export {
  type SemanticRank,
  type SemanticPriority,
  type SemanticWeight,
  type RankableSemanticState,
  type OrderByField,
  type OrderDirection,
  type OrderingOptions,
} from './Ranking';
export { createOrderedView } from './OrderedView';
export {
  SEMANTIC_ENGINE_COMPONENT_ID,
  SEMANTIC_RANKING_COMPONENT_ID,
  SEMANTIC_EXPLANATIONS_COMPONENT_ID,
  isSemanticEngineEnabled,
  isRankingEnabled,
  isExplanationsEnabled,
} from './SemanticKillSwitch';
export { SemanticEngine } from './SemanticEngine';
