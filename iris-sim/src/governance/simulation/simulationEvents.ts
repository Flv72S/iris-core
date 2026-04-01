/**
 * Step 7D — Simulation event types and scenario model.
 */

export type SimulationEventType =
  | 'INVARIANT_VIOLATION'
  | 'FLIP_SPIKE'
  | 'ENTROPY_DRIFT'
  | 'VIOLATION_CLUSTER'
  | 'RECOVERY_PHASE'
  | 'STABILITY_PERIOD';

export interface SimulationEvent {
  readonly type: SimulationEventType;
  readonly intensity: number;
  readonly durationSteps: number;
}

export interface GovernanceSimulationScenario {
  readonly name: string;
  readonly description?: string;
  readonly totalSteps: number;
  readonly events: readonly SimulationEvent[];
}
