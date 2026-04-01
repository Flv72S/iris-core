/**
 * Kill-switch scenario fixture types.
 */

export type KillSwitchScenarioId = 'global-off' | 'feature-off' | 'action-type-off';

export type KillSwitchScenarioFixture = {
  readonly id: KillSwitchScenarioId;
  readonly description: string;
  readonly registryOverrides: Readonly<Record<string, boolean>>;
};
