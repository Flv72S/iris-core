/**
 * Optional product user-preference options for FeaturePipelineEngine.run.
 * Preferences are evaluated only after the feature has passed policies; they only restrict.
 */

import type { UserPreferenceState } from '../user-preferences/UserPreferenceState';
import type { UserPreferenceKillSwitchRegistry } from '../user-preferences/UserPreferenceKillSwitch';

export interface FeaturePipelinePreferenceOptions {
  readonly userPreferences?: UserPreferenceState;
  readonly preferenceKillSwitch?: UserPreferenceKillSwitchRegistry;
  readonly getFeatureCategory?: (featureId: string) => string | undefined;
}
