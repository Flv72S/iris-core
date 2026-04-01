/**
 * Guardrail scenario fixtures — max actions, cooldown, abort conditions.
 */

import type { GuardrailScenarioFixture } from './types';

export const MAX_ACTIONS_PER_WINDOW: GuardrailScenarioFixture = Object.freeze({
  id: 'max-actions-per-window',
  description: 'Limit actions in time window exceeded',
  params: Object.freeze({ maxActions: 3, windowMs: 600_000, recentCount: 3 }),
});

export const COOLDOWN_PER_FEATURE: GuardrailScenarioFixture = Object.freeze({
  id: 'cooldown-per-feature',
  description: 'Same feature already executed in cooldown window',
  params: Object.freeze({ cooldownMs: 300_000, sameFeatureExecutedAt: 1 }),
});

export const ABORT_SYSTEM_CONDITION: GuardrailScenarioFixture = Object.freeze({
  id: 'abort-system-condition',
  description: 'System condition (e.g. wellbeing) blocks execution',
  params: Object.freeze({ wellbeingBlocked: true }),
});

export const ABORT_USER_CONDITION: GuardrailScenarioFixture = Object.freeze({
  id: 'abort-user-condition',
  description: 'User/hard block blocks execution',
  params: Object.freeze({ userBlock: true }),
});

export const ALL_GUARDRAIL_SCENARIOS: readonly GuardrailScenarioFixture[] = Object.freeze([
  MAX_ACTIONS_PER_WINDOW,
  COOLDOWN_PER_FEATURE,
  ABORT_SYSTEM_CONDITION,
  ABORT_USER_CONDITION,
]);
