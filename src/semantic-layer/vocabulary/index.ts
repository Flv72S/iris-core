/**
 * Phase 8 Semantic Vocabulary — 8.1.2
 *
 * Vocabolario dichiarativo, tipizzato, chiuso. Base di ogni semantica futura.
 * La Fase 8 MAY parlare SOLO usando termini dichiarati qui.
 * MUST NOT inventare nuove parole, stati o categorie.
 */

export {
  type SemanticStateId,
  type SemanticScope,
  type TemporalValidity,
  type SemanticState,
  SEMANTIC_STATE_CONTRACT,
} from './SemanticState';

export {
  type SemanticContextId,
  type SemanticContextOrigin,
  type SemanticContext,
  SEMANTIC_CONTEXT_CONTRACT,
} from './SemanticContext';

export {
  type DeclaredCriteria,
  type RankingDirection,
  type SemanticRanking,
  SEMANTIC_RANKING_CONTRACT,
} from './SemanticRanking';

export {
  type TimeWindow,
  type DecayFunction,
  type SemanticMemory,
  SEMANTIC_MEMORY_CONTRACT,
} from './SemanticMemory';

export {
  type LocalizedText,
  type DeclaredReason,
  type SemanticExplanation,
  SEMANTIC_EXPLANATION_CONTRACT,
} from './SemanticExplanation';

export {
  type SemanticCondition,
  type TechnicalLimit,
  type SemanticPolicy,
  SEMANTIC_POLICY_CONTRACT,
} from './SemanticPolicy';

export { type Disableable, DISABLEABLE_CONTRACT } from './Disableable';

export {
  FORBIDDEN_SEMANTIC_TERMS,
  isForbiddenTerm,
  FORBIDDEN_VOCABULARY_CONTRACT,
} from './forbidden';
