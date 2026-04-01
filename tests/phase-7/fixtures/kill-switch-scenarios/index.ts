/**
 * Kill-switch scenario fixtures — global, feature, action-type OFF.
 * Demonstrates immediate block, append-only log, no residual side-effects.
 */

import {
  EXECUTION_ENGINE_COMPONENT_ID,
  SEND_NOTIFICATION_COMPONENT_ID,
} from '../../../../src/core/execution/kill-switch/ExecutionKillSwitch';
import { getFeatureKillSwitchKey } from '../../../../src/core/execution/execution-killswitch';
import type { KillSwitchScenarioFixture } from './types';

export const GLOBAL_OFF: KillSwitchScenarioFixture = Object.freeze({
  id: 'global-off',
  description: 'Global execution engine disabled',
  registryOverrides: Object.freeze({ [EXECUTION_ENGINE_COMPONENT_ID]: false }),
});

export const FEATURE_OFF: KillSwitchScenarioFixture = Object.freeze({
  id: 'feature-off',
  description: 'Feature Wellbeing disabled via kill-switch',
  registryOverrides: Object.freeze({ [getFeatureKillSwitchKey('Wellbeing')]: false }),
});

export const ACTION_TYPE_OFF: KillSwitchScenarioFixture = Object.freeze({
  id: 'action-type-off',
  description: 'Action type SEND_NOTIFICATION disabled',
  registryOverrides: Object.freeze({ [SEND_NOTIFICATION_COMPONENT_ID]: false }),
});

export const ALL_KILL_SWITCH_SCENARIOS: readonly KillSwitchScenarioFixture[] = Object.freeze([
  GLOBAL_OFF,
  FEATURE_OFF,
  ACTION_TYPE_OFF,
]);
