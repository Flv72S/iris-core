/**
 * S-5B — Frontier discovery configuration. Deterministic, no randomness.
 */

export interface FrontierConfig {
  readonly baseSeed: string;
  readonly initialNodeCounts: number[];
  readonly initialIntensities: number[];
  readonly initialDurations: number[];
  readonly expansionStepNode: number;
  readonly expansionStepIntensity: number;
  readonly expansionStepDuration: number;
  readonly maxNodeLimit: number;
  readonly maxIntensityLimit: number;
  readonly maxDurationLimit: number;
  readonly refinementIterations: number;
  readonly seedsPerConfig: number;
}

export const DEFAULT_FRONTIER_CONFIG: FrontierConfig = Object.freeze({
  baseSeed: 's5b-frontier-base-seed',
  initialNodeCounts: [200, 500, 1000],
  initialIntensities: [0.6, 1.0, 1.3],
  initialDurations: [1000, 2000],
  expansionStepNode: 300,
  expansionStepIntensity: 0.2,
  expansionStepDuration: 500,
  maxNodeLimit: 2000,
  maxIntensityLimit: 1.5,
  maxDurationLimit: 4000,
  refinementIterations: 3,
  seedsPerConfig: 5,
});

export function createFrontierConfig(overrides: Partial<FrontierConfig> = {}): FrontierConfig {
  return Object.freeze({ ...DEFAULT_FRONTIER_CONFIG, ...overrides });
}
