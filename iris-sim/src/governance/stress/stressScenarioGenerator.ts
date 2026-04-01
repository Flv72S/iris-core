/**
 * Step 6F — Stress scenario generation. Deterministic, pure, O(n).
 */

import type { GovernanceSignal } from '../governanceTypes.js';
import type { DynamicsSnapshot } from '../hardening/invariantTypes.js';
import type { StressScenarioOutput, StressSimulationConfig } from './stressSimulationTypes.js';
import { privateRandom } from './deterministicRng.js';

const PLATEAUS: DynamicsSnapshot['plateauStrength'][] = ['STRONG', 'WEAK', 'FRAGILE'];
const ENVELOPES: DynamicsSnapshot['envelopeState'][] = ['SAFE', 'STRESS', 'CRITICAL'];
const MODES: GovernanceSignal['mode'][] = ['NORMAL', 'CONSERVATIVE', 'RECOVERY', 'FROZEN'];

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

function dyn(
  timestamp: number,
  residualInstabilityScore: number,
  plateauStrength: DynamicsSnapshot['plateauStrength'],
  envelopeState: DynamicsSnapshot['envelopeState']
): DynamicsSnapshot {
  return Object.freeze({
    timestamp,
    residualInstabilityScore: clamp01(residualInstabilityScore),
    plateauStrength,
    envelopeState,
  });
}

function sig(
  mode: GovernanceSignal['mode'],
  budgetMultiplier: number,
  commitRateMultiplier: number,
  adaptationDampening: number,
  confidence: number
): GovernanceSignal {
  return Object.freeze({
    mode,
    budgetMultiplier: clamp01(budgetMultiplier),
    commitRateMultiplier: clamp01(commitRateMultiplier),
    adaptationDampening: clamp01(adaptationDampening),
    confidence: clamp01(confidence),
  });
}

/**
 * Generate deterministic stress scenario. Same config + seed → same output.
 */
export function generateStressScenario(config: StressSimulationConfig): StressScenarioOutput {
  const steps = Math.max(2, config.steps ?? 100);
  const seed = config.seed ?? 0;
  const rng = privateRandom(seed);
  const baseTime = 1000000;

  const dynamicsHistory: DynamicsSnapshot[] = [];
  const governanceSignalHistory: GovernanceSignal[] = [];

  switch (config.scenario) {
    case 'STABLE_BASELINE': {
      for (let i = 0; i < steps; i++) {
        const residual = 0.08 + rng() * 0.04;
        dynamicsHistory.push(dyn(baseTime + i * 1000, residual, 'STRONG', 'SAFE'));
        governanceSignalHistory.push(sig('NORMAL', 0.95, 0.95, 0.1, 0.9));
      }
      break;
    }
    case 'REGIME_DRIFT': {
      for (let i = 0; i < steps; i++) {
        const t = i / Math.max(1, steps - 1);
        const residual = clamp01(0.15 + t * 0.7 + rng() * 0.05);
        const plateauIdx = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
        const envelopeIdx = t < 0.33 ? 0 : t < 0.66 ? 1 : 2;
        dynamicsHistory.push(dyn(baseTime + i * 1000, residual, PLATEAUS[plateauIdx], ENVELOPES[envelopeIdx]));
        governanceSignalHistory.push(sig('NORMAL', 0.9, 0.9, 0.2, 0.85));
      }
      break;
    }
    case 'MODE_OSCILLATION': {
      for (let i = 0; i < steps; i++) {
        dynamicsHistory.push(dyn(baseTime + i * 1000, 0.2 + rng() * 0.1, 'STRONG', 'SAFE'));
        governanceSignalHistory.push(
          sig(MODES[i % 4], 0.5 + rng() * 0.4, 0.5 + rng() * 0.4, 0.2, 0.8)
        );
      }
      break;
    }
    case 'RECOVERY_ACCELERATION': {
      let r0 = 0.2;
      let r1 = 0.202;
      const acc = 0.0001;
      for (let i = 0; i < steps; i++) {
        let residual: number;
        if (i === 0) residual = r0;
        else if (i === 1) residual = r1;
        else {
          const vel = r1 - r0;
          residual = clamp01(r1 + vel + acc);
          r0 = r1;
          r1 = residual;
        }
        dynamicsHistory.push(dyn(baseTime + i * 1000, residual, 'WEAK', 'STRESS'));
        governanceSignalHistory.push(sig('RECOVERY', 0.9, 0.9, 0.6, 0.85));
      }
      break;
    }
    case 'PLATEAU_COLLAPSE': {
      const collapseAt = Math.floor(steps * 0.6);
      for (let i = 0; i < steps; i++) {
        const pastCollapse = i >= collapseAt;
        const residual = pastCollapse ? 0.7 + rng() * 0.2 : 0.15 + rng() * 0.05;
        const plateau = pastCollapse ? 'FRAGILE' : 'STRONG';
        const envelope = pastCollapse ? (rng() < 0.5 ? 'STRESS' : 'CRITICAL') : 'SAFE';
        dynamicsHistory.push(dyn(baseTime + i * 1000, residual, plateau, envelope));
        governanceSignalHistory.push(sig('NORMAL', 0.85, 0.85, 0.2, 0.8));
      }
      break;
    }
    case 'ENTROPY_ESCALATION': {
      for (let i = 0; i < steps; i++) {
        dynamicsHistory.push(
          dyn(baseTime + i * 1000, 0.4 + rng() * 0.2, 'WEAK', ENVELOPES[i % 3])
        );
        governanceSignalHistory.push(
          sig(MODES[i % 4], 0.5 + rng() * 0.5, 0.5 + rng() * 0.5, 0.3, 0.75)
        );
      }
      break;
    }
    default: {
      for (let i = 0; i < steps; i++) {
        dynamicsHistory.push(dyn(baseTime + i * 1000, 0.1, 'STRONG', 'SAFE'));
        governanceSignalHistory.push(sig('NORMAL', 0.9, 0.9, 0.1, 0.9));
      }
    }
  }

  return Object.freeze({
    dynamicsHistory,
    governanceSignalHistory,
  });
}
