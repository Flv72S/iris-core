/**
 * Demo Scenarios — Input deterministici al UX Contract.
 * Nessuna logica, decisione o adattamento. Solo composizione.
 * La UI Demo può importare solo da qui per gli scenari.
 */

export type { DemoScenarioId } from './DemoScenarioId';
export type { DemoScenarioDefinition } from './DemoScenarioDefinition';
export { buildDemoUxContract } from './buildDemoUxContract';
export { DEMO_SCENARIOS } from './demoScenarioCatalog';
export {
  DEMO_SCENARIO_COMPONENT_ID,
  isDemoScenarioEnabled,
  type DemoScenarioRegistry,
} from './DemoScenarioKillSwitch';
