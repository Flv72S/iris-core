/**
 * State Derivation — Deriva stato prodotto da semantic signals. Read-only, deterministico.
 * Nessuna execution, nessuna decisione finale, nessuna attivazione feature.
 */

export type { DerivedUxState } from './derived-ux-state/DerivedUxState';
export type { UxStateType, UxSeverity, SemanticSignalId } from './derived-ux-state/types';
export type { DerivedExperienceCandidate } from './derived-experience/DerivedExperienceCandidate';
export type { ExperienceLabel } from './derived-experience/types';
export type { FeatureEligibility } from './feature-eligibility/FeatureEligibility';
export type { FeatureId } from './feature-eligibility/types';
export type { DerivedStateSnapshot } from './DerivedStateSnapshot';
export { deriveState } from './StateDerivationEngine';
