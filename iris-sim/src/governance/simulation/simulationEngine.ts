/**
 * Step 7D — Governance simulation engine. Deterministic projection.
 */

import type { GovernanceTier } from '../tiering/hysteresis.js';
import type { GovernanceTierSnapshot } from '../tiering/snapshot.js';
import type { GovernanceSimulationScenario, SimulationEvent } from './simulationEvents.js';
import type { SimulationModelVersion } from './simulationModel.js';
import { applySimulationEvent } from './eventApplication.js';
import { rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo } from './recomputation.js';
import { projectTier } from './tierProjection.js';

export interface SimulationState {
  readonly step: number;
  readonly currentScore: number;
  readonly projectedTier: GovernanceTier;
}

export interface GovernanceSimulationResult {
  readonly modelVersion: SimulationModelVersion;
  readonly scenarioName: string;
  readonly initialTier: GovernanceTier;
  readonly finalTier: GovernanceTier;
  readonly lowestTierReached: GovernanceTier;
  readonly scoreTimeline: readonly number[];
  readonly tierTimeline: readonly GovernanceTier[];
  readonly steps: number;
}

const TIER_ORDER: GovernanceTier[] = [
  'TIER_0_LOCKED',
  'TIER_1_RESTRICTED',
  'TIER_2_CONTROLLED',
  'TIER_3_STABLE',
  'TIER_4_ENTERPRISE_READY',
];

function tierWorst(a: GovernanceTier, b: GovernanceTier): GovernanceTier {
  const ia = TIER_ORDER.indexOf(a);
  const ib = TIER_ORDER.indexOf(b);
  return ia <= ib ? a : b;
}

function getActiveEvent(step: number, events: readonly SimulationEvent[]): SimulationEvent | null {
  let stepsRemaining = step;
  for (const ev of events) {
    if (stepsRemaining < ev.durationSteps) return ev;
    stepsRemaining -= ev.durationSteps;
  }
  return null;
}

/**
 * Run governance simulation: apply scenario events step-by-step, recompute score, project tier.
 */
export function runGovernanceSimulation(
  baseSnapshot: GovernanceTierSnapshot,
  scenario: GovernanceSimulationScenario
): GovernanceSimulationResult {
  const totalSteps = Math.max(1, scenario.totalSteps);
  const scoreTimeline: number[] = [];
  const tierTimeline: GovernanceTier[] = [];

  let metrics: Record<string, number> = {
    flipStability: baseSnapshot.normalizedMetrics.flipStability,
    invariantIntegrity: baseSnapshot.normalizedMetrics.invariantIntegrity,
    entropyControl: baseSnapshot.normalizedMetrics.entropyControl,
    violationPressure: baseSnapshot.normalizedMetrics.violationPressure,
  };

  const initialState: SimulationState = {
    step: 0,
    currentScore: baseSnapshot.score,
    projectedTier: baseSnapshot.tier,
  };
  let state: SimulationState = initialState;
  let lowestTier: GovernanceTier = baseSnapshot.tier;

  for (let step = 0; step < totalSteps; step++) {
    const event = getActiveEvent(step, scenario.events);
    if (event) {
      metrics = applySimulationEvent(metrics, event);
    }
    const score = rMp1oViPb3EdvcJ5kxoqe52RuaiK6YiUYo(metrics);
    const projectedTier = projectTier(score, {
      currentTier: state.projectedTier,
      lastUpgradeAt: null,
      lastDowngradeAt: null,
    });
    scoreTimeline.push(score);
    tierTimeline.push(projectedTier);
    lowestTier = tierWorst(lowestTier, projectedTier);
    state = { step: step + 1, currentScore: score, projectedTier };
  }

  const initialTier = baseSnapshot.tier;
  const finalTier = tierTimeline.length > 0 ? tierTimeline[tierTimeline.length - 1]! : initialTier;

  return Object.freeze({
    modelVersion: '7D_v1.0',
    scenarioName: scenario.name,
    initialTier,
    finalTier,
    lowestTierReached: lowestTier,
    scoreTimeline,
    tierTimeline,
    steps: totalSteps,
  });
}
