/**
 * Step 6E — Governance hardening invariant types.
 * Purely verificative; no operational changes.
 */

export interface FormalInvariantResult {
  readonly invariantName: string;
  readonly violated: boolean;
  readonly severityScore: number;
  readonly confidence: number;
  readonly diagnosticMessage?: string;
}

export interface HardeningAuditReport {
  readonly timestamp: number;
  readonly regimeConsistencyScore: number;
  readonly hysteresisPersistenceScore: number;
  readonly monotonicityScore: number;
  readonly invariantResults: readonly FormalInvariantResult[];
  readonly globalHardeningIndex: number;
  readonly systemSafe: boolean;
}

export type DynamicsSnapshot = {
  readonly timestamp: number;
  readonly residualInstabilityScore: number;
  readonly plateauStrength: 'STRONG' | 'WEAK' | 'FRAGILE';
  readonly envelopeState: 'SAFE' | 'STRESS' | 'CRITICAL';
};

export interface HardeningInvariantConfig {
  readonly windowSize: number;
  readonly epsilon: number;
  readonly hardeningThreshold: number;
}

export const DefaultHardeningInvariantConfig: HardeningInvariantConfig = Object.freeze({
  windowSize: 50,
  epsilon: 0.001,
  hardeningThreshold: 0.85,
});
