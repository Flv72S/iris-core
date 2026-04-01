/**
 * Demo Scenario Kill-Switch — OFF → sempre NEUTRAL_IDLE.
 * Registry standard: chiave componente → boolean.
 */

export const DEMO_SCENARIO_COMPONENT_ID = 'demo-scenarios';

export type DemoScenarioRegistry = Record<string, boolean>;

export function isDemoScenarioEnabled(
  registry: DemoScenarioRegistry
): boolean {
  return registry[DEMO_SCENARIO_COMPONENT_ID] === true;
}
