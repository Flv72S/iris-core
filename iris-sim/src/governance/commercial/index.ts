/**
 * Step 7C — Commercial Packaging & Feature Gating.
 */

export type { CommercialModelVersion } from './commercialModel.js';
export type { IrisFeatureId, FeatureRequirement } from './featureRegistry.js';
export {
  FEATURE_REQUIREMENTS,
  tierOrderIndex,
  tierSatisfiesMinimum,
  getRequirement,
} from './featureRegistry.js';
export type { FeatureAccessDecision, FeatureEvaluationContext } from './featureGating.js';
export { evaluateFeatureAccess, evaluateAllFeatures } from './featureGating.js';
export type { CommercialPackage, PackagePolicy } from './packagePolicy.js';
export { PACKAGE_POLICIES } from './packagePolicy.js';
export { evaluatePackageEligibility } from './packageEligibility.js';
export type {
  CommercialCapabilitySnapshot,
  CommercialSnapshotContext,
} from './capabilitySnapshot.js';
export { generateCommercialSnapshot } from './capabilitySnapshot.js';
