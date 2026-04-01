/**
 * Step 7A — Governance Maturity Engine. Versioned tiering model config.
 * Pure, deterministic, audit-ready.
 */

export type TieringModelVersion = '7A_v1.0';

export interface TieringModelConfig {
  readonly version: TieringModelVersion;
  readonly weights: {
    readonly flipStability: number;
    readonly invariantIntegrity: number;
    readonly entropyControl: number;
    readonly violationPressure: number;
  };
  readonly penaltyCurves: {
    readonly violationCurve: 'exp';
    readonly flipCurve: 'log';
  };
  readonly decayLambda: number;
  readonly geometricAggregation: boolean;
  readonly hardCaps: boolean;
  readonly antiGamingEnabled: boolean;
  readonly structuralFloorEnabled: boolean;
}

export interface NormalizedMetricVector {
  readonly flipStability: number;
  readonly invariantIntegrity: number;
  readonly entropyControl: number;
  readonly violationPressure: number;
}

const WEIGHT_SUM_EPS = 1e-9;

export function validateTieringConfig(config: TieringModelConfig): void {
  const w = config.weights;
  const sum =
    w.flipStability + w.invariantIntegrity + w.entropyControl + w.violationPressure;
  if (Math.abs(sum - 1) > WEIGHT_SUM_EPS) {
    throw new Error(
      `TieringModelConfig weights must sum to 1.0, got ${sum}`
    );
  }
}

export const TIERING_MODEL_V1: TieringModelConfig = Object.freeze({
  version: '7A_v1.0',
  weights: Object.freeze({
    flipStability: 0.3,
    invariantIntegrity: 0.3,
    entropyControl: 0.2,
    violationPressure: 0.2,
  }),
  penaltyCurves: Object.freeze({
    violationCurve: 'exp',
    flipCurve: 'log',
  }),
  decayLambda: 0.001,
  geometricAggregation: true,
  hardCaps: true,
  antiGamingEnabled: true,
  structuralFloorEnabled: true,
});

validateTieringConfig(TIERING_MODEL_V1);
