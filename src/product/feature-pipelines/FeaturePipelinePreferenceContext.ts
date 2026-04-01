/**
 * Context for User Preference check in the pipeline.
 * Applied after Feature Activation Policies. If BLOCKED, the output is not produced.
 */

import type { UserPreferenceEngine } from '../../core/user-preferences/UserPreferenceEngine';
import type { UserPreferenceStore } from '../../core/user-preferences/store/UserPreferenceStore';
import type { UserPreferenceKillSwitchRegistry } from '../../core/user-preferences/kill-switch/UserPreferenceKillSwitch';
import type { ProductMode } from '../orchestration/ProductMode';

export interface FeaturePipelinePreferenceContext {
  readonly engine: UserPreferenceEngine;
  readonly store: UserPreferenceStore;
  readonly killSwitch: UserPreferenceKillSwitchRegistry;
  readonly productMode: ProductMode;
}
