/**
 * Feature Toggle System - livello piattaforma
 * Microstep 5.3.4
 */

export type { FeatureDefinition, FeatureEnvironment } from './FeatureDefinition';
export {
  createFeatureEvaluationContext,
  type FeatureEvaluationContext,
} from './FeatureEvaluationContext';
export {
  featureEnabled,
  featureDisabled,
  isFeatureEnabled,
  type FeatureDecision,
} from './FeatureDecision';
export {
  createFeatureToggle,
  type FeatureToggle,
} from './FeatureToggle';
export { FeatureToggleService } from './FeatureToggleService';
