/**
 * S-2 — Chaos configuration. Fully serializable.
 */

export interface ChaosConfig {
  readonly maxAttackIntensity: number;
  readonly allowCrashStorm: boolean;
  readonly allowPartitionFlap: boolean;
  readonly allowByzantineSwarm: boolean;
  readonly allowFloodAttack: boolean;
  readonly allowCensorship: boolean;
  readonly allowSplitBrain: boolean;
  readonly allowTimingManipulation: boolean;
  readonly attackSeed: string;
  readonly invariantStrictMode: boolean;
  readonly monitoringGranularity: number;
}

export const DEFAULT_CHAOS_CONFIG: ChaosConfig = Object.freeze({
  maxAttackIntensity: 100,
  allowCrashStorm: true,
  allowPartitionFlap: true,
  allowByzantineSwarm: true,
  allowFloodAttack: true,
  allowCensorship: true,
  allowSplitBrain: true,
  allowTimingManipulation: true,
  attackSeed: 'chaos-default-seed',
  invariantStrictMode: true,
  monitoringGranularity: 1,
});

export function createChaosConfig(overrides: Partial<ChaosConfig> = {}): ChaosConfig {
  return Object.freeze({ ...DEFAULT_CHAOS_CONFIG, ...overrides });
}
