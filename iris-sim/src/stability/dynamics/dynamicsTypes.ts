/**
 * Stability Step 5C — Regime dynamics monitoring types.
 * Purely observational; no modification of pipeline or state.
 */

export type EnvelopeState = 'SAFE' | 'STRESS' | 'CRITICAL';

export interface RegimeSnapshot {
  readonly timestamp: number;
  readonly stabilityIndex: number;
  readonly envelopeState: EnvelopeState;
  readonly latencyMultiplier?: number;
  readonly validationPassed?: boolean;
}

export interface TrajectoryMetrics {
  readonly gradient: number;
  readonly acceleration: number;
  readonly oscillationAmplitude: number;
  readonly convergenceVelocity: number;
}

export interface TransitionEntry {
  readonly from: EnvelopeState;
  readonly to: EnvelopeState;
  readonly timestamp: number;
}

export interface EnvelopeResidenceStats {
  readonly SAFE: number;
  readonly STRESS: number;
  readonly CRITICAL: number;
}

export type PlateauStrength = 'STRONG' | 'WEAK' | 'FRAGILE';

export interface ConvergenceResult {
  readonly status: 'CONVERGED' | 'TRANSIENT' | 'NON_CONVERGENT';
  readonly confidence: number;
  readonly plateauStrength: PlateauStrength;
  readonly pseudoConvergenceReason?: string;
}

export interface ResidualRiskProjection {
  readonly score: number;
}

export interface MonitoringConfig {
  readonly gradientEpsilon: number;
  readonly oscillationEpsilon: number;
  readonly stabilityHorizon: number;
  readonly w1: number;
  readonly w2: number;
  readonly w3: number;
}

export const DefaultMonitoringConfig: MonitoringConfig = Object.freeze({
  gradientEpsilon: 0.002,
  oscillationEpsilon: 0.01,
  stabilityHorizon: 5,
  w1: 0.5,
  w2: 0.3,
  w3: 0.2,
});

export interface DynamicsReport {
  readonly convergenceStatus: 'CONVERGED' | 'TRANSIENT' | 'NON_CONVERGENT';
  readonly convergenceConfidence: number;
  readonly residualInstabilityScore: number;
  readonly trajectoryStabilityScore: number;
  readonly transitionFrequency: number;
  readonly envelopeResidence: EnvelopeResidenceStats;
  readonly metaStability: boolean;
  readonly plateauStrength: PlateauStrength;
  readonly shockDetected: boolean;
  readonly shockCount: number;
}
