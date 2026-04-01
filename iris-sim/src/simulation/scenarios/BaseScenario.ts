/**
 * S-1 — Base scenario type. Scenarios register scheduled events only.
 */

import type { GlobalSimulationEngine } from '../engine/GlobalSimulationEngine.js';

export interface BaseScenario {
  readonly name: string;
  register(engine: GlobalSimulationEngine): void;
}
