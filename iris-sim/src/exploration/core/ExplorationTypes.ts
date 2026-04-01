/**
 * S-5 — Parameter space exploration type definitions.
 */

export interface ParameterConfig {
  readonly nodeCount: number;
  readonly intensity: number;
  readonly duration: number;
}

export interface ParameterResult {
  readonly config: ParameterConfig;
  readonly stabilityIndex: number;
  readonly safetyFailureRate: number;
  readonly livenessFailureRate: number;
  readonly riskEnvelope: 'SAFE' | 'STRESS' | 'CRITICAL';
  readonly maxSoftEvents: number;
  readonly maxLivenessDelay: number;
  readonly riskReportHash: string;
  /** S-6: max over seeds for this config (when degradation enabled). */
  readonly maxDegradationDrops?: number;
  readonly maxDegradationSaturationEvents?: number;
  readonly maxDegradationLatencyMultiplier?: number;
}

export type RegionClassification = 'SAFE' | 'STRESS' | 'CRITICAL';
