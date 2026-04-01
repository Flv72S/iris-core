/**
 * S-4 — Liveness metrics (per seed).
 */

export interface LivenessMetrics {
  readonly livenessPropertyViolations: number;
  readonly maxEventualDeliveryDelayTicks: number;
  readonly starvationIncidents: number;
  readonly deadlockDetected: boolean;
  readonly livenessPropertyStatuses: readonly { id: string; status: string }[];
}

export function createLivenessMetrics(
  livenessPropertyViolations: number,
  maxEventualDeliveryDelayTicks: number,
  starvationIncidents: number,
  deadlockDetected: boolean,
  livenessPropertyStatuses: readonly { id: string; status: string }[],
): LivenessMetrics {
  return Object.freeze({
    livenessPropertyViolations,
    maxEventualDeliveryDelayTicks,
    starvationIncidents,
    deadlockDetected,
    livenessPropertyStatuses: Object.freeze([...livenessPropertyStatuses]),
  });
}
