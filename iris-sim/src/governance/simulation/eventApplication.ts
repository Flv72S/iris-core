/**
 * Step 7D — Apply simulation event to normalized metrics.
 */

import type { SimulationEvent } from './simulationEvents.js';
import { perturbMetric } from './perturbation.js';

const DEFAULT_METRICS = {
  flipStability: 0.9,
  invariantIntegrity: 0.9,
  entropyControl: 0.9,
  violationPressure: 0.9,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}

/**
 * Apply a single simulation event to a copy of metrics. Returns new record.
 */
export function applySimulationEvent(
  metrics: Record<string, number>,
  event: SimulationEvent
): Record<string, number> {
  const m = { ...DEFAULT_METRICS, ...metrics };
  const intensity = clamp01(event.intensity);

  switch (event.type) {
    case 'INVARIANT_VIOLATION':
      m.invariantIntegrity = perturbMetric(m.invariantIntegrity ?? 0.9, intensity, 'decrease');
      break;
    case 'FLIP_SPIKE':
      m.flipStability = perturbMetric(m.flipStability ?? 0.9, intensity, 'decrease');
      break;
    case 'ENTROPY_DRIFT':
      m.entropyControl = perturbMetric(m.entropyControl ?? 0.9, intensity, 'decrease');
      break;
    case 'VIOLATION_CLUSTER':
      m.violationPressure = perturbMetric(m.violationPressure ?? 0.9, intensity, 'decrease');
      break;
    case 'RECOVERY_PHASE':
      m.flipStability = perturbMetric(m.flipStability ?? 0.9, intensity * 0.5, 'increase');
      m.invariantIntegrity = perturbMetric(m.invariantIntegrity ?? 0.9, intensity * 0.5, 'increase');
      m.entropyControl = perturbMetric(m.entropyControl ?? 0.9, intensity * 0.5, 'increase');
      m.violationPressure = perturbMetric(m.violationPressure ?? 0.9, intensity * 0.5, 'increase');
      break;
    case 'STABILITY_PERIOD':
      break;
    default:
      break;
  }

  return {
    flipStability: clamp01(m.flipStability ?? 0.9),
    invariantIntegrity: clamp01(m.invariantIntegrity ?? 0.9),
    entropyControl: clamp01(m.entropyControl ?? 0.9),
    violationPressure: clamp01(m.violationPressure ?? 0.9),
  };
}
