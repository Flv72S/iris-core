/**
 * Killer Feature Cognitive Coverage — Verifica formale di copertura.
 * Nessuna execution, nessuna decisione, nessuna UI/UX logic.
 */

export type { KillerFeatureId } from './types';
export { KILLER_FEATURE_IDS } from './types';
export type { KillerFeatureSignalCoverage } from './signal-coverage/SemanticSignalCoverage';
export { verifySignalCoverage } from './signal-coverage/SemanticSignalCoverage';
export type { KillerFeatureStateCoverage } from './state-coverage/StateDerivationCoverage';
export { verifyStateCoverage } from './state-coverage/StateDerivationCoverage';
export type { KillerFeatureSafetyGuarantee } from './guarantees/NoExecutionGuarantee';
export { verifySafetyGuarantees } from './guarantees/NoExecutionGuarantee';
export type { KillerFeatureCoverageReport } from './KillerFeatureCoverageReport';
export { generateKillerFeatureCoverageReport } from './KillerFeatureCoverageReport';
