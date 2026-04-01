/**
 * Step 7D — Predefined stress test scenarios.
 */

import type { GovernanceSimulationScenario } from './simulationEvents.js';

export const STRESS_SCENARIOS: readonly GovernanceSimulationScenario[] = Object.freeze([
  Object.freeze({
    name: 'Invariant Crisis',
    totalSteps: 20,
    events: Object.freeze([
      Object.freeze({ type: 'INVARIANT_VIOLATION', intensity: 0.8, durationSteps: 5 }),
    ]),
  }),
  Object.freeze({
    name: 'Flip Instability',
    totalSteps: 30,
    events: Object.freeze([
      Object.freeze({ type: 'FLIP_SPIKE', intensity: 0.7, durationSteps: 10 }),
    ]),
  }),
  Object.freeze({
    name: 'Entropy Drift',
    totalSteps: 40,
    events: Object.freeze([
      Object.freeze({ type: 'ENTROPY_DRIFT', intensity: 0.6, durationSteps: 20 }),
    ]),
  }),
  Object.freeze({
    name: 'Recovery Simulation',
    totalSteps: 40,
    events: Object.freeze([
      Object.freeze({ type: 'VIOLATION_CLUSTER', intensity: 0.7, durationSteps: 10 }),
      Object.freeze({ type: 'RECOVERY_PHASE', intensity: 0.5, durationSteps: 20 }),
    ]),
  }),
]);
