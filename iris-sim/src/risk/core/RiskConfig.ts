/**
 * S-4 — Risk engine configuration.
 */

export interface RiskConfig {
  readonly baseSeed: string;
  readonly numberOfSeeds: number;
  readonly scenarioName: string;
  readonly maxTicks: bigint;
  readonly messageCount: number;
  readonly stabilityWeights: {
    readonly safetyFailure: number;
    readonly livenessFailure: number;
    readonly maxLivenessDelayNorm: number;
    readonly softExplosionNorm: number;
    /** S-6: degradation penalties (bounded, deterministic). */
    readonly dropPenaltyNorm: number;
    readonly saturationPenaltyNorm: number;
    readonly latencyPenaltyNorm: number;
  };
  readonly stressThresholdSoftEvents: number;
  readonly stressThresholdLivenessDelay: number;
  /** S-6: thresholds for normalization (drops, saturation events, latency multiplier). */
  readonly stressThresholdDegradationDrops: number;
  readonly stressThresholdDegradationSaturation: number;
  readonly stressThresholdDegradationLatency: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = Object.freeze({
  baseSeed: 's4-risk-base-seed',
  numberOfSeeds: 20,
  scenarioName: 'EnterpriseStress',
  maxTicks: 1500n,
  messageCount: 5000,
  stabilityWeights: Object.freeze({
    safetyFailure: 0.35,
    livenessFailure: 0.35,
    maxLivenessDelayNorm: 0.08,
    softExplosionNorm: 0.08,
    dropPenaltyNorm: 0.05,
    saturationPenaltyNorm: 0.05,
    latencyPenaltyNorm: 0.04,
  }),
  stressThresholdSoftEvents: 2000,
  stressThresholdLivenessDelay: 100,
  stressThresholdDegradationDrops: 50,
  stressThresholdDegradationSaturation: 10,
  stressThresholdDegradationLatency: 3,
});

export function createRiskConfig(overrides: Partial<RiskConfig> = {}): RiskConfig {
  return Object.freeze({ ...DEFAULT_RISK_CONFIG, ...overrides });
}
